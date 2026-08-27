import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const BACKGROUND = { r: 11, g: 15, b: 25, alpha: 1 }; // #0b0f19

async function renderIcon(svgBuffer, size, paddingRatio, outFile) {
  const logoSize = Math.round(size * (1 - paddingRatio * 2));
  const offset = Math.round((size - logoSize) / 2);

  const logo = await sharp(svgBuffer)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toFile(path.join(publicDir, outFile));

  console.log(`Generated public/${outFile}`);
}

async function main() {
  await mkdir(publicDir, { recursive: true });
  const svgBuffer = await readFile(path.join(publicDir, "favicon.svg"));

  await renderIcon(svgBuffer, 192, 0.12, "pwa-192.png");
  await renderIcon(svgBuffer, 512, 0.12, "pwa-512.png");
  // Maskable needs a bigger safe-zone (icon must sit inside the middle ~80%)
  await renderIcon(svgBuffer, 512, 0.22, "pwa-maskable.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});