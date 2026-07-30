/**
 * Normalises the Wix scrape into web working masters and derives per photo data.
 *
 *   originals/<folder>/dbd5a8_<hash>.jpg   (up to 6048px, 283MB total)
 *        -> src/photos/<slug>/<slug>-NN.jpg  (2560px long edge)
 *        -> src/data/photos.json             (dimensions + sampled light)
 *
 * Ids are pinned to the source file, never to its sort position. Once a
 * photograph has an id it keeps it forever, and anything new is appended at the
 * end of its album. This matters because src/data/alt-text.ts keys off these
 * ids: if adding one photograph could renumber the rest, every alt string after
 * it would silently describe the wrong picture. That is worse than a crash.
 *
 * Run locally after changing originals/: npm run photos
 * The output is committed, so Cloudflare never touches originals/.
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LONG_EDGE = 2560;

/** originals folder -> album slug. "portraits" is renamed, almost none are portraits. */
const ALBUMS = [
  { folder: 'uk-and-elsewhere', slug: 'uk-and-elsewhere' },
  { folder: 'hong-kong', slug: 'hong-kong' },
  { folder: 'portraits', slug: 'figures' },
  { folder: 'animals', slug: 'animals' },
];

const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Average colour of the brightest slice of an image.
 * This is the photograph's own light, and it drives the ambient warmth on hover.
 */
async function sampleLight(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(48, 48, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    pixels.push({ r, g, b, l: 0.2126 * r + 0.7152 * g + 0.0722 * b });
  }
  pixels.sort((a, b) => a.l - b.l);

  const slice = pixels.slice(Math.floor(pixels.length * 0.92));
  const sum = slice.reduce(
    (acc, p) => [acc[0] + p.r, acc[1] + p.g, acc[2] + p.b],
    [0, 0, 0]
  );
  return hex(sum.map((v) => v / slice.length));
}

const dataPath = path.join(ROOT, 'src', 'data', 'photos.json');

/** Existing source hash -> id, so previously assigned ids survive a rerun. */
const assigned = new Map();
try {
  for (const p of JSON.parse(await fs.readFile(dataPath, 'utf-8'))) {
    if (p.source) assigned.set(p.source, p.id);
  }
} catch {
  // First run, nothing to preserve.
}

const manifest = [];
let processed = 0;
let added = 0;

for (const album of ALBUMS) {
  const srcDir = path.join(ROOT, 'originals', album.folder);
  const outDir = path.join(ROOT, 'src', 'photos', album.slug);
  await fs.mkdir(outDir, { recursive: true });

  const files = (await fs.readdir(srcDir)).filter((f) => f.endsWith('.jpg')).sort();

  // Next free number in this album, so new photographs append rather than
  // displacing anything that already has an id.
  let next = 0;
  for (const id of assigned.values()) {
    const m = id.match(new RegExp(`^${album.slug}-(\\d+)$`));
    if (m) next = Math.max(next, Number(m[1]));
  }

  console.log(`\n${album.slug} (${files.length})`);

  for (const file of files) {
    const source = file.replace('.jpg', '');
    let id = assigned.get(source);
    const isNew = !id;
    if (isNew) {
      id = `${album.slug}-${String(++next).padStart(2, '0')}`;
      assigned.set(source, id);
      added++;
    }
    const input = await fs.readFile(path.join(srcDir, file));

    const output = await sharp(input)
      .rotate() // honour any orientation flag before we discard metadata
      .resize(LONG_EDGE, LONG_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    await fs.writeFile(path.join(outDir, `${id}.jpg`), output.data);

    manifest.push({
      id,
      album: album.slug,
      file: `${id}.jpg`,
      source,
      width: output.info.width,
      height: output.info.height,
      light: await sampleLight(input),
    });

    processed++;
    const kb = (output.data.length / 1024).toFixed(0);
    console.log(
      `  ${id}  ${output.info.width}x${output.info.height}  ${kb}KB${isNew ? '   <- NEW, needs alt text' : ''}`
    );
  }
}

manifest.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

await fs.mkdir(path.dirname(dataPath), { recursive: true });
await fs.writeFile(dataPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\nDone. ${processed} photos, ${added} newly added.`);
