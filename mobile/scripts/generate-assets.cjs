const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
if (!process.env.XDG_CACHE_HOME)
  process.env.XDG_CACHE_HOME = path.join(os.tmpdir(), "gymfinder-assets-cache");
require("node:fs").mkdirSync(process.env.XDG_CACHE_HOME, { recursive: true });
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");
// Original geometric artwork: no downloaded images or external font required for the app mark.
const mark = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
 <circle cx="512" cy="512" r="306" stroke="#d4d4d8" stroke-width="12"/>
 <g transform="rotate(-32 512 512)" stroke="#ffffff" stroke-width="18">
 <path d="M372 512H652"/>
 <rect x="310" y="414" width="62" height="196" rx="14"/>
 <rect x="652" y="414" width="62" height="196" rx="14"/>
 <path d="M280 466V558M744 466V558"/>
 </g>
 <path d="M512 164V194M830 512H860M512 830V860M164 512H194" stroke="#d4d4d8" stroke-width="12"/>
 </g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${mark}</svg>`;
async function main() {
  await fs.mkdir(path.join(root, "assets/store"), { recursive: true });
  await fs.writeFile(path.join(root, "assets/brand-mark.svg"), svg + "\n");
  const image = sharp(Buffer.from(svg));
  await image
    .clone()
    .flatten({ background: "#000000" })
    .removeAlpha()
    .png()
    .toFile(path.join(root, "assets/icon.png"));
  await image
    .clone()
    .png()
    .toFile(path.join(root, "assets/adaptive-foreground.png"));
  await image.clone().png().toFile(path.join(root, "assets/splash.png"));
  await image
    .clone()
    .resize(512, 512)
    .flatten({ background: "#000000" })
    .removeAlpha()
    .png()
    .toFile(path.join(root, "assets/store/google-play-icon.png"));
  const feature = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="500" viewBox="0 0 1024 500"><defs><symbol id="mark" viewBox="0 0 1024 1024">${mark}</symbol></defs><rect width="1024" height="500" fill="#000000"/><use xlink:href="#mark" x="24" y="50" width="400" height="400"/><text x="460" y="238" fill="#ffffff" font-family="DejaVu Sans, sans-serif" font-size="70" font-weight="500">GymFinder</text><text x="464" y="282" fill="#d4d4d8" font-family="DejaVu Sans, sans-serif" font-size="19" letter-spacing="4">FIND YOUR FIT.</text><path d="M464 320H950" stroke="#404040"/></svg>`;
  await fs.writeFile(
    path.join(root, "assets/store/feature-graphic.svg"),
    feature + "\n",
  );
  await sharp(Buffer.from(feature))
    .removeAlpha()
    .png()
    .toFile(path.join(root, "assets/store/feature-graphic.png"));
  console.log("Generated app, adaptive, splash and Google Play artwork.");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
