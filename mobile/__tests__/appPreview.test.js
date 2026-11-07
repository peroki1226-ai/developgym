/** @jest-environment node */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { createPreviewServer } = require("../scripts/app-preview.cjs");

describe("the app preview serves mobile code instead of the legacy prototype", () => {
  let directory, server, port, current;
  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "gymfinder-preview-test-"));
    fs.writeFileSync(path.join(directory, "preview-info.json"), JSON.stringify({ sourceHash: "built", source: "mobile/App.tsx", kind: "expo-app-preview" }));
    fs.writeFileSync(path.join(directory, "index.html"), '<div id="root">Expo app</div>');
    fs.writeFileSync(path.join(directory, "app.js"), "/* app bundle */");
    current = "built";
    server = createPreviewServer({ directory, fingerprint: () => current });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    port = server.address().port;
  });
  afterAll(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  function request(url, method = "GET") {
    return new Promise((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port, path: url, method }, response => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => { body += chunk; });
        response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
      });
      req.on("error", reject);
      req.end();
    });
  }
  test("the root and former index URL lead to the same native app preview", async () => {
    for (const url of ["/", "/index.html", "/app-preview"]) {
      const result = await request(url);
      expect(result.status).toBe(302);
      expect(result.headers.location).toBe("/app-preview/");
    }
    const app = await request("/app-preview/");
    expect(app.body).toContain('id="root"');
    expect(app.headers["cache-control"]).toBe("no-store");
  });
  test("the HTML launcher never falls back to the frozen index.html", async () => {
    const launch = await request("/gym-app-preview.html");
    expect(launch.status).toBe(200);
    expect(launch.body).toContain("./app-preview/preview-info.json");
    expect(launch.body).not.toContain('url=./index.html');
    expect(launch.body).not.toContain('new URL("./index.html"');
  });
  test("source changes are refused until a fresh build, rather than displaying stale code", async () => {
    current = "edited";
    try {
      for (const url of ["/app-preview/", "/app-preview/preview-info.json"]) {
        const result = await request(url);
        expect(result.status).toBe(409);
        if (url.endsWith(".json")) expect(JSON.parse(result.body).error).toBe("stale-preview");
        else expect(result.body).toContain("npm run preview:app");
      }
    } finally { current = "built"; }
  });
  test("missing assets return 404, not old HTML, and repository files stay private", async () => {
    for (const url of ["/app-preview/missing.js", "/.env", "/mobile/app.json", "/app-preview/%2e%2e%2fmobile/app.json"]) {
      expect((await request(url)).status).not.toBe(200);
    }
    const asset = await request("/app-preview/app.js");
    expect(asset.headers["content-type"]).toBe("application/javascript");
  });
  test("HEAD has no body, mutations are rejected, and the old worker is retired without clearing storage", async () => {
    expect((await request("/app-preview/", "HEAD")).body).toBe("");
    expect((await request("/app-preview/", "POST")).status).toBe(405);
    const sw = await request("/sw.js");
    expect(sw.body).toContain("self.registration.unregister()");
    expect(sw.body).not.toMatch(/localStorage|caches\.delete/);
  });
  test("a native signed build keeps the production config and only the preview gets its base path", () => {
    const config = require("../app.json").expo;
    const configure = require("../app.config.js");
    const previous = process.env.GYMFINDER_APP_PREVIEW;
    try {
      delete process.env.GYMFINDER_APP_PREVIEW;
      expect(configure({ config })).toBe(config);
      process.env.GYMFINDER_APP_PREVIEW = "1";
      expect(configure({ config }).experiments.baseUrl).toBe("/app-preview");
      expect(config.experiments?.baseUrl).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.GYMFINDER_APP_PREVIEW;
      else process.env.GYMFINDER_APP_PREVIEW = previous;
    }
  });
});
