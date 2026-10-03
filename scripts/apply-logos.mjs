// One-off asset generation: derives every brand asset from the two source
// logos. Run with `bun scripts/apply-logos.mjs` after replacing the sources in
// `assets/`. Outputs live in `public/`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SOURCES = {
  horizontal: "assets/logo_site.png",
  icon: "assets/logo_icone.png",
};

const OUT = {
  // Header / wordmark — keep the PNG name so the layout can use it directly.
  wordmark: { file: "public/sintoniamora-logo-horizontal.png", width: 1254 },
  icon192: { file: "public/sintoniamora-icon-192.png", size: 192 },
  icon512: { file: "public/sintoniamora-icon-512.png", size: 512 },
  iconMaskable: { file: "public/sintoniamora-icon-maskable.png", size: 512, maskable: true },
  favicon32: { file: "public/favicon-32.png", size: 32 },
};

await mkdir("public", { recursive: true });

// Horizontal logo for the header, exported as WebP to keep the payload small.
await sharp(SOURCES.horizontal)
  .trim({ background: "#00000000" })
  .resize({ width: OUT.wordmark.width, withoutEnlargement: true })
  .webp({ quality: 92 })
  .toFile(OUT.wordmark.file.replace(/\.png$/, ".webp"));

// Plain square icons.
for (const key of ["icon192", "icon512", "favicon32"]) {
  const { file, size } = OUT[key];
  await sharp(SOURCES.icon)
    .resize({ width: size, height: size, fit: "contain", background: "#00000000" })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

// Maskable icons need the artwork inside the safe circle (80% of the canvas),
// otherwise Android crops the logo away.
const maskSize = OUT.iconMaskable.size;
const art = Math.round(maskSize * 0.78);
const pad = (maskSize - art) / 2;
await sharp(SOURCES.icon)
  .resize({ width: art, height: art, fit: "contain", background: "#00000000" })
  .extend({
    top: Math.round(pad),
    bottom: Math.round(maskSize - art - Math.round(pad)),
    left: Math.round(pad),
    right: Math.round(maskSize - art - Math.round(pad)),
    background: "#12080c",
  })
  .png({ compressionLevel: 9 })
  .toFile(OUT.iconMaskable.file);

// Real .ico for legacy browsers — 32px is the size favicon.ico advertises.
const ico32 = await sharp(OUT.favicon32.file).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header[6] = 32; // width
header[7] = 32; // height
header[8] = 0; // palette
header[9] = 0; // reserved
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico32.length, 14);
header.writeUInt32LE(22, 18);
await Bun.write("public/favicon.ico", Buffer.concat([header, ico32]));

console.log("Brand assets written to public/");