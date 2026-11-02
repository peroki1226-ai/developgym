const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
if (!process.env.XDG_CACHE_HOME)
  process.env.XDG_CACHE_HOME = path.join(os.tmpdir(), "gymfinder-assets-cache");
require("node:fs").mkdirSync(process.env.XDG_CACHE_HOME, { recursive: true });
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");
// Original geometric artwork: no downloaded images or external font required for the app mark.
const mark = `<g fill="none" stroke="#0878f9" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
<circle cx="512" cy="425" r="245"/>
<ellipse cx="512" cy="425" rx="120" ry="245"/>
<path d="M267 425H757M308 290H716M308 560H716M363 632L512 852L661 632"/>
<path d="M165 355V495M208 315V535M816 315V535M859 355V495" stroke-width="32"/>
</g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${mark}</svg>`;
async function main() {
  await fs.mkdir(path.join(root, "assets/store"), { recursive: true });
  await fs.writeFile(path.join(root, "assets/brand-mark.svg"), svg + "\n");
  const image = sharp(Buffer.from(svg));
  await image
    .clone()
    .flatten({ background: "#ffffff" })
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
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .png()
    .toFile(path.join(root, "assets/store/google-play-icon.png"));
  const feature = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="500" viewBox="0 0 1024 500"><defs><symbol id="mark" viewBox="0 0 1024 1024">${mark}</symbol></defs><rect width="1024" height="500" fill="#ffffff"/><use xlink:href="#mark" x="24" y="50" width="400" height="400"/><text x="460" y="238" fill="#0878f9" font-family="DejaVu Sans, sans-serif" font-size="70" font-weight="500">GymFinder</text><text x="464" y="282" fill="#d4d4d8" font-family="DejaVu Sans, sans-serif" font-size="19" letter-spacing="4">YOUR TRAINING. ANYWHERE.</text><path d="M464 320H950" stroke="#404040"/></svg>`;
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
