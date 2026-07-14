import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
const masterPath = path.join(publicDir, "fevicon.png");

async function roundSquarePng(inputBuffer, size, radiusRatio = 0.26) {
  const inset = Math.max(1, Math.round(size * 0.04));
  const innerSize = size - inset * 2;
  const radius = Math.round(size * radiusRatio);

  const insetImage = await sharp(inputBuffer)
    .resize(innerSize, innerSize, { fit: "cover" })
    .png()
    .toBuffer();

  const canvas = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: insetImage, left: inset, top: inset }])
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`,
  );

  return sharp(canvas).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

const masterSource = await sharp(masterPath).png().toBuffer();
const masterSize = 512;
const masterRounded = await roundSquarePng(masterSource, masterSize);
await writeFile(masterPath, masterRounded);

for (const size of [16, 32, 48, 180]) {
  const rounded = await roundSquarePng(masterSource, size);
  await writeFile(path.join(publicDir, `fevicon-${size}.png`), rounded);
}

console.log("Updated rounded fevicon.png and fevicon-16/32/48/180.png");
