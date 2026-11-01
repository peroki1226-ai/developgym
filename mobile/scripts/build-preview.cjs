const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const { JSDOM } = require("jsdom");
const sharp = require("sharp");
const root = path.resolve(__dirname, "../.."),
  destination = path.join(root, "web-dist");
const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
(async () => {
  const sourcePath = path.join(root, "index.html");
  const dom = new JSDOM(fs.readFileSync(sourcePath, "utf8")),
    doc = dom.window.document;
  if (!doc.getElementById("app-root"))
    throw new Error("Preview source must contain app-root");
  for (const script of doc.querySelectorAll("script")) {
    if (script.src) {
      if (
        script.src !==
        "https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"
      )
        throw new Error(
          "Bundle external scripts before publishing: " + script.src,
        );
      script.remove();
    } else new vm.Script(script.textContent);
  }
  if (doc.querySelector("iframe"))
    throw new Error("Preview must contain the app, not an embedded tunnel");
  for (const link of doc.querySelectorAll("link"))
    if (
      /fonts\.(googleapis|gstatic)\.com/.test(link.href) ||
      link.rel === "manifest"
    )
      link.remove();
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.join(destination, "assets"), { recursive: true });
  const temp = path.join(destination, "assets/build.css");
  execFileSync(
    process.execPath,
    [
      require.resolve("tailwindcss/lib/cli.js"),
      "--content",
      sourcePath,
      "--output",
      temp,
      "--minify",
    ],
    { stdio: "pipe", cwd: root },
  );
  const css =
    fs.readFileSync(temp, "utf8") +
    "\n" +
    fs.readFileSync(path.join(root, "preview/pwa.css"), "utf8");
  const cssName = "assets/app." + hash(css) + ".css";
  fs.writeFileSync(path.join(destination, cssName), css);
  fs.unlinkSync(temp);
  const script =
    fs.readFileSync(path.join(root, "preview/storage.js"), "utf8") +
    "\n" +
    fs.readFileSync(path.join(root, "preview/pwa.js"), "utf8");
  new vm.Script(script);
  const scriptName = "assets/app." + hash(script) + ".js";
  fs.writeFileSync(path.join(destination, scriptName), script);
  const style = doc.createElement("link");
  style.rel = "stylesheet";
  style.href = "./" + cssName;
  doc.head.append(style);
  const client = doc.createElement("script");
  client.src = "./" + scriptName;
  client.defer = true;
  doc.body.append(client);
  const manifest = doc.createElement("link");
  manifest.rel = "manifest";
  manifest.href = "./manifest-ja.webmanifest";
  doc.head.append(manifest);
  for (const [name, content] of Object.entries({
    "theme-color": "#000000",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "ジムファインダー",
  })) {
    const element = doc.createElement("meta");
    element.name = name;
    element.content = content;
    doc.head.append(element);
  }
  const touch = doc.createElement("link");
  touch.rel = "apple-touch-icon";
  touch.href = "./assets/icon-180.png";
  doc.head.append(touch);
  doc.getElementById("app-root").innerHTML =
    '<p role="status" style="padding:24px;color:white">◌</p><noscript>ブラウザーのスクリプト実行を有効にして開いてください。</noscript>';
  fs.writeFileSync(path.join(destination, "index.html"), dom.serialize());
  dom.window.close();
  fs.copyFileSync(
    path.join(destination, "index.html"),
    path.join(destination, "gym-app-preview.html"),
  );
  for (const size of [180, 192, 512])
    await sharp(path.join(root, "mobile/assets/icon.png"))
      .resize(size, size)
      .png()
      .toFile(path.join(destination, `assets/icon-${size}.png`));
  const base = {
    id: "./",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [192, 512].map((size) => ({
      src: `./assets/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
  for (const lang of ["ja", "en"])
    fs.writeFileSync(
      path.join(destination, `manifest-${lang}.webmanifest`),
      JSON.stringify(
        {
          ...base,
          lang,
          name: lang === "ja" ? "ジムファインダー" : "GymFinder",
          short_name: lang === "ja" ? "ジムファインダー" : "GymFinder",
          description:
            lang === "ja"
              ? "ジム検索・トレーニング・食事の記録"
              : "Gym search, workouts and nutrition records",
        },
        null,
        2,
      ),
    );
  const files = [
    "./",
    "./index.html",
    "./gym-app-preview.html",
    "./" + cssName,
    "./" + scriptName,
    "./manifest-ja.webmanifest",
    "./manifest-en.webmanifest",
    ...[180, 192, 512].map((size) => `./assets/icon-${size}.png`),
  ];
  const version = hash(
    files
      .map((file) =>
        file === "./"
          ? ""
          : fs.readFileSync(path.join(destination, file.slice(2))),
      )
      .join("\n"),
  );
  const worker = fs
    .readFileSync(path.join(root, "preview/sw.template.js"), "utf8")
    .replace("__CACHE__", version)
    .replace("__FILES__", JSON.stringify(files));
  new vm.Script(worker);
  fs.writeFileSync(path.join(destination, "sw.js"), worker);
  fs.writeFileSync(path.join(destination, ".nojekyll"), "");
  fs.writeFileSync(
    path.join(destination, "build-info.json"),
    JSON.stringify(
      { version, source: path.basename(sourcePath), files },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        output: destination,
        source: path.basename(sourcePath),
        version,
        files: files.length,
        externalRuntimeAssets: 0,
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
