const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");
const app = require("../app.json").expo;
const eas = require("../eas.json");
async function image(file, width, height, alpha) {
  const name = path.join(root, file);
  assert(fs.existsSync(name), `Missing ${file}`);
  const m = await sharp(name).metadata();
  assert.equal(m.format, "png", file);
  assert.equal(m.width, width, file);
  assert.equal(m.height, height, file);
  if (alpha !== undefined)
    assert.equal(Boolean(m.hasAlpha), alpha, `${file}: alpha`);
}
async function main() {
  assert.equal(app.name, "GymFinder");
  assert.equal(app.version, "1.0.0");
  assert.equal(app.ios.bundleIdentifier, "com.peroki.gymfinder");
  assert.equal(app.android.package, "com.peroki.gymfinder");
  assert(/^\d+$/.test(app.ios.buildNumber));
  assert(
    Number.isInteger(app.android.versionCode) && app.android.versionCode > 0,
  );
  assert.equal(app.icon, "./assets/icon.png");
  await image(app.icon, 1024, 1024, false);
  await image(app.android.adaptiveIcon.foregroundImage, 1024, 1024, true);
  await image(app.android.adaptiveIcon.monochromeImage, 1024, 1024, true);
  assert.equal(app.android.adaptiveIcon.backgroundColor, "#000000");
  assert(app.android.permissions.includes("android.permission.CAMERA"));
  const splash = app.plugins.find(
    (p) => Array.isArray(p) && p[0] === "expo-splash-screen",
  )?.[1];
  assert(splash, "Missing splash plugin");
  assert.equal(splash.backgroundColor, "#000000");
  assert.equal(splash.resizeMode, "contain");
  await image(splash.image, 1024, 1024, true);
  const picker = app.plugins.find(
    (p) => Array.isArray(p) && p[0] === "expo-image-picker",
  )?.[1];
  assert(picker?.cameraPermission?.includes("設備写真"));
  assert(picker?.photosPermission?.includes("写真"));
  assert.equal(picker.microphonePermission, false);
  for (const permission of [
    "RECORD_AUDIO",
    "READ_MEDIA_IMAGES",
    "READ_MEDIA_VIDEO",
    "READ_MEDIA_AUDIO",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE",
    "SYSTEM_ALERT_WINDOW",
  ])
    assert(
      app.android.blockedPermissions.includes(
        `android.permission.${permission}`,
      ),
      permission,
    );
  assert.equal(eas.cli.appVersionSource, "local");
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(eas.build.preview.android.buildType, "apk");
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(eas.build.production.android.buildType, "app-bundle");
  for (const profile of ["preview", "production"]) {
    assert.equal(eas.build[profile].credentialsSource, "remote");
    assert.equal(eas.build[profile].ios.simulator, false);
    assert.equal(eas.build[profile].autoIncrement, false);
  }
  await image("assets/store/google-play-icon.png", 512, 512, false);
  await image("assets/store/feature-graphic.png", 1024, 500, false);
  const listing = require("../store/metadata.ja.json");
  assert(listing.name.length <= 30);
  assert(listing.ios.subtitle.length <= 30);
  assert(Buffer.byteLength(listing.ios.keywords, "utf8") <= 100);
  assert(listing.android.shortDescription.length <= 80);
  assert(listing.description.length <= 4000);
  console.log(
    "Release metadata, image dimensions/alpha, profile semantics and listing limits verified.",
  );
  console.log(
    "Signing, native builds, screenshots and store submission are separate, unverified operations.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
