/**
 * Generates the PWA icon set from inline SVGs (brand: Layers mark on an
 * indigo gradient), using the project's bundled `sharp`.
 *
 * Run: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const LAYERS_PATHS = [
  "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
  "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
  "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
];
const PLUS_PATHS = ["M5 12h14", "M12 5v14"];
const CHECK_PATHS = ["M20 6 9 17l-5-5"];

/** Build an icon SVG. `maskable` keeps content inside the launcher safe zone. */
function iconSvg(size, paths, { maskable = false, rounded = true } = {}) {
  const contentRatio = maskable ? 0.42 : 0.52;
  const scale = (size * contentRatio) / 24;
  const offset = (size - 24 * scale) / 2;
  const rx = rounded && !maskable ? Math.round(size * 0.225) : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${size}" y2="${size}">
      <stop offset="0" stop-color="#8a93ff"/>
      <stop offset="1" stop-color="#6c76f2"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#g)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${paths.map((d) => `<path d="${d}"/>`).join("\n    ")}
  </g>
</svg>`;
}

async function writePng(file, svg) {
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("✓", file);
}

await mkdir("public/icons", { recursive: true });

// Standard ("any") icons — rounded corners, full design.
for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
  await writePng(`public/icons/icon-${size}x${size}.png`, iconSvg(size, LAYERS_PATHS));
}

// Maskable icons — full bleed, content inside the safe zone.
for (const size of [192, 512]) {
  await writePng(
    `public/icons/icon-maskable-${size}x${size}.png`,
    iconSvg(size, LAYERS_PATHS, { maskable: true }),
  );
}

// Home-screen shortcut icons.
await writePng("public/icons/shortcut-quick-add.png", iconSvg(192, PLUS_PATHS));
await writePng("public/icons/shortcut-tasks.png", iconSvg(192, CHECK_PATHS));

// Apple touch icon — full bleed (iOS applies its own mask).
await writePng("public/apple-touch-icon.png", iconSvg(180, LAYERS_PATHS, { rounded: false }));
