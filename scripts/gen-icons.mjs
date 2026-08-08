import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#171717"/>
  <text x="256" y="300" font-family="Arial, Helvetica, sans-serif" font-size="200" font-weight="700" fill="#ffffff" text-anchor="middle">IL</text>
</svg>
`;

mkdirSync("public", { recursive: true });

const targets = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-icon.png", size: 180 },
];

for (const t of targets) {
  await sharp(Buffer.from(svg)).resize(t.size, t.size).png().toFile(t.file);
  console.log("wrote", t.file);
}
