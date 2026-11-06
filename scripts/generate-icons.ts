import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#4089ff"/><stop offset="1" stop-color="#1654d8"/></linearGradient></defs><rect width="512" height="512" fill="#102B70"/><rect x="40" y="40" width="432" height="432" rx="110" fill="url(#b)"/><path d="M167 345 345 167M185 167h160v160" fill="none" stroke="#F8FAFC" stroke-width="37" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
async function main() {
  await mkdir("public/icons", { recursive: true });
  for (const [name, size] of [
    ["icon-192", 192],
    ["icon-512", 512],
    ["maskable-512", 512],
    ["apple-touch-icon", 180],
  ] as const)
    await sharp(Buffer.from(icon))
      .resize(size, size)
      .png()
      .toFile(`public/icons/${name}.png`);
}
main().catch(() => {
  process.exitCode = 1;
});
