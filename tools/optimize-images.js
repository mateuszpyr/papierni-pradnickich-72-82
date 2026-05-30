// WebP-only image pipeline.
// Reads source JPGs/PNGs from `assets-src/` (same folder structure as `assets/`),
// resizes + encodes to WebP, writes to `assets/<same path>.webp`.
//
// Usage: NODE_PATH=c:\work\repo\node_modules node tools/optimize-images.js
//
// Source files in `assets-src/` are NOT shipped (gitignored). The `assets/` folder
// contains only the WebP outputs that the site actually serves.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets-src');
const DST = path.join(ROOT, 'assets');

// [relativePath (under assets-src/ and assets/, with .jpg|.png extension), maxWidth, webpQuality]
const TARGETS = [
  ['img/showcase-osiedle.jpg',          1600, 72],
  ['img/showcase-papyrer.jpg',          1600, 72],
  ['img/og-default.jpg',                1200, 75],
  ['gallery/osiedle/01.jpg',            1800, 72],
  ['gallery/osiedle/02.jpg',            1800, 72],
  ['gallery/osiedle/03.jpg',            1800, 72],
  ['gallery/osiedle/04.jpg',            1800, 72],
  ['gallery/osiedle/05.jpg',            1800, 72],
  ['img/news/reprezentant.jpg',         1400, 72],
  ['img/news/plakaty-ryszarda-kai.jpg', 1400, 72],
  ['img/news/energia-bierna.jpg',       1400, 72],
  ['img/news/gorka-narodowa-zachod-park.jpg', 1400, 72],
  ['img/news/spotkanie-2025-02-21.jpg', 1400, 72],
  ['img/news/podsumowanie.jpg',         1400, 72],
];

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error('Source folder missing:', SRC);
    console.error('Place original JPGs/PNGs under assets-src/ mirroring the assets/ structure.');
    process.exit(1);
  }

  let totalOut = 0;
  for (const [rel, maxW, q] of TARGETS) {
    const srcAbs = path.join(SRC, rel);
    if (!fs.existsSync(srcAbs)) { console.log('skip (missing):', rel); continue; }

    const srcSize = fs.statSync(srcAbs).size;
    const buf = fs.readFileSync(srcAbs);
    const meta = await sharp(buf).metadata();
    const resize = meta.width && meta.width > maxW ? { width: maxW } : undefined;

    const dstAbs = path.join(DST, rel).replace(/\.(jpe?g|png)$/i, '.webp');
    fs.mkdirSync(path.dirname(dstAbs), { recursive: true });

    const out = await sharp(buf).resize(resize).webp({ quality: q }).toBuffer();
    fs.writeFileSync(dstAbs, out);
    totalOut += out.length;

    console.log(
      rel.padEnd(48),
      `${(srcSize/1024).toFixed(0)}KB ->`,
      `webp ${(out.length/1024).toFixed(0)}KB`
    );
  }
  console.log('\nTotal webp output:', (totalOut/1024).toFixed(0), 'KB');
})().catch((e) => { console.error(e); process.exit(1); });
