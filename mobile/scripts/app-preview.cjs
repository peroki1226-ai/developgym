"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const mobile = path.resolve(__dirname, "..");
const root = path.resolve(mobile, "..");
const output = path.join(root, "app-preview");

function sourceHash() {
  const digest = crypto.createHash("sha256");
  function add(relative) {
    const absolute = path.join(mobile, relative);
    if (fs.statSync(absolute).isDirectory()) {
      for (const child of fs.readdirSync(absolute).sort()) add(relative + "/" + child);
    } else digest.update(relative).update("\0").update(fs.readFileSync(absolute)).update("\0");
  }
  for (const file of ["App.tsx", "src", "assets", "app.json", "app.config.js", "tsconfig.json", "package.json", "package-lock.json", "scripts/app-preview.cjs", "scripts/verify-language.cjs"])
    add(file);
  digest.update("gym-app-preview.html").update(fs.readFileSync(path.join(root, "gym-app-preview.html")));
  return digest.digest("hex");
}

function build() {
  execFileSync(process.execPath, [path.join(__dirname, "verify-language.cjs")], { cwd: mobile, stdio: "inherit" });
  const before = sourceHash();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gymfinder-app-preview-"));
  try {
    execFileSync(process.execPath, [require.resolve("expo/bin/cli"), "export", "--platform", "web", "--output-dir", temp], {
      cwd: mobile,
      stdio: "inherit",
      env: { ...process.env, CI: "1", EXPO_OFFLINE: "1", EXPO_NO_TELEMETRY: "1", GYMFINDER_APP_PREVIEW: "1" },
    });
    if (before !== sourceHash()) throw new Error("Source changed while exporting. Run preview:app again.");
    const html = fs.readFileSync(path.join(temp, "index.html"), "utf8");
    if (!html.includes('id="root"') || !html.includes("/app-preview/_expo/"))
      throw new Error("Expected the Expo app with /app-preview asset paths, not the legacy HTML.");
    let commit = null;
    try { commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch {}
    const info = { kind: "expo-app-preview", source: "mobile/App.tsx", sourceHash: before, commit, builtAt: new Date().toISOString() };
    fs.writeFileSync(path.join(temp, "preview-info.json"), JSON.stringify(info, null, 2));
    if (fs.existsSync(output) && !fs.existsSync(path.join(output, "preview-info.json")))
      throw new Error("app-preview exists but is not a generated app preview; refusing to replace it.");
    // Copy across filesystems too (the export temp directory can be a separate mount).
    fs.rmSync(output, { recursive: true, force: true });
    fs.cpSync(temp, output, { recursive: true });
    return info;
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

function createPreviewServer({ directory = output, fingerprint = sourceHash, launcher = path.join(root, "gym-app-preview.html") } = {}) {
  const info = JSON.parse(fs.readFileSync(path.join(directory, "preview-info.json")));
  return http.createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status, type, body) => { response.writeHead(status, { "Content-Type": type }); response.end(request.method === "HEAD" ? undefined : body); };
    if (!["GET", "HEAD"].includes(request.method)) {
      response.setHeader("Allow", "GET, HEAD");
      return send(405, "text/plain; charset=utf-8", "Method not allowed");
    }
    let pathname, requestUrl;
    try {
      requestUrl = new URL(request.url, "http://localhost");
      pathname = decodeURIComponent(requestUrl.pathname);
    }
    catch { return send(400, "text/plain; charset=utf-8", "Invalid path"); }
    if (pathname === "/sw.js") {
      // Retire only this origin's former preview worker. Do not erase saved app data.
      response.setHeader("Service-Worker-Allowed", "/");
      return send(200, "application/javascript", 'self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.registration.unregister()));');
    }
    if (["/", "/index.html", "/app-preview"].includes(pathname)) {
      const modes = requestUrl.searchParams.getAll("lang");
      const mode = modes.length === 1 && ["ja", "en"].includes(modes[0]) ? `?lang=${modes[0]}` : "";
      response.writeHead(302, { Location: "/app-preview/" + mode });
      return response.end();
    }
    if (pathname === "/gym-app-preview.html")
      return send(200, "text/html; charset=utf-8", fs.readFileSync(launcher));
    if (!pathname.startsWith("/app-preview/")) return send(404, "text/plain; charset=utf-8", "Not found");
    let relative = pathname.slice("/app-preview/".length) || "index.html";
    if (relative.split(/[\\/]/).includes("..") || relative.includes("\0"))
      return send(400, "text/plain; charset=utf-8", "Invalid path");
    if (["index.html", "preview-info.json"].includes(relative)) {
      try {
        if (fingerprint() !== info.sourceHash)
          return relative === "index.html"
            ? send(409, "text/html; charset=utf-8", fs.readFileSync(launcher))
            : send(409, "application/json", JSON.stringify({ error: "stale-preview" }));
      } catch { return send(503, "text/plain; charset=utf-8", "Cannot verify preview source. Restart preview:app."); }
    }
    const file = path.resolve(directory, relative);
    if (!file.startsWith(path.resolve(directory) + path.sep)) return send(400, "text/plain", "Invalid path");
    try {
      if (!fs.statSync(file).isFile()) return send(404, "text/plain", "Not found");
      const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2" };
      return send(200, mime[path.extname(file)] || "application/octet-stream", fs.readFileSync(file));
    } catch (error) {
      return send(error.code === "ENOENT" ? 404 : 500, "text/plain", "Preview asset unavailable");
    }
  });
}

if (require.main === module) {
  try {
    const portFlag = process.argv.indexOf("--port");
    const port = Number(portFlag < 0 ? 3000 : process.argv[portFlag + 1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Use --port 1..65535");
    const info = build();
    console.log("App source:", info.source, info.sourceHash.slice(0, 12));
    if (!process.argv.includes("--build-only")) {
      const server = createPreviewServer();
      server.on("error", error => {
        console.error(error.code === "EADDRINUSE" ? `Port ${port} is occupied. Stop the old preview server or use --port another-number.` : error.message);
        process.exitCode = 1;
      });
      server.listen(port, "0.0.0.0", () => {
        console.log(`Native app preview: http://localhost:${port}/app-preview/`);
        console.log(`Japanese mode: http://localhost:${port}/app-preview/?lang=ja`);
        console.log(`English mode: http://localhost:${port}/app-preview/?lang=en`);
      });
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { build, sourceHash, createPreviewServer };
