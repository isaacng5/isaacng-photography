/**
 * Compares the live Wix site against what we shipped, photograph by photograph,
 * by media id. Nothing here trusts an earlier count.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PROJ = '/Users/isaac/Documents/Photography Website';

const ALBUMS = [
  { wix: 'cityscape', local: 'uk-and-elsewhere', folder: 'uk-and-elsewhere' },
  { wix: 'landscape', local: 'hong-kong', folder: 'hong-kong' },
  { wix: 'fashion', local: 'figures', folder: 'portraits' },
  { wix: 'animals', local: 'animals', folder: 'animals' },
];

const browser = await chromium.launch();
const report = {};

for (const album of ALBUMS) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const seen = new Set();

  page.on('response', (r) => {
    const m = r.url().match(/\/media\/([a-f0-9]{6}_[a-f0-9]{32})~mv2/i);
    if (m) seen.add(m[1].toLowerCase());
  });

  const url = `https://isaacng1.wixsite.com/my-site/portfolio-collections/recent-works/${album.wix}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);

  // Scroll the whole thing several times; Wix galleries load in on scroll.
  for (let pass = 0; pass < 3; pass++) {
    let last = -1;
    for (let i = 0; i < 40; i++) {
      const h = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate((y) => window.scrollTo(0, y), (i * 600) % (h + 600));
      await page.waitForTimeout(220);
      if (h === last && i > 12) break;
      last = h;
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
  }

  // Also read ids straight out of the DOM, in case a response was missed.
  const domIds = await page.evaluate(() => {
    const out = new Set();
    const grab = (s) => {
      if (!s) return;
      const re = /\/media\/([a-f0-9]{6}_[a-f0-9]{32})~mv2/gi;
      let m;
      while ((m = re.exec(s))) out.add(m[1].toLowerCase());
    };
    document.querySelectorAll('img').forEach((i) => {
      grab(i.currentSrc);
      grab(i.src);
      grab(i.srcset);
    });
    document.querySelectorAll('[style*="wixstatic"]').forEach((e) => grab(e.getAttribute('style')));
    grab(document.documentElement.innerHTML);
    return [...out];
  });
  domIds.forEach((id) => seen.add(id));

  const localFiles = fs
    .readdirSync(path.join(PROJ, 'originals', album.folder))
    .filter((f) => f.endsWith('.jpg'))
    .map((f) => f.replace('.jpg', '').toLowerCase());

  const live = [...seen];
  const missing = live.filter((id) => !localFiles.includes(id));
  const extra = localFiles.filter((id) => !live.includes(id));

  report[album.local] = { liveCount: live.length, localCount: localFiles.length, missing, extra };

  console.log(`\n${album.local}`);
  console.log(`  live on Wix : ${live.length}`);
  console.log(`  we have     : ${localFiles.length}`);
  console.log(`  MISSING     : ${missing.length}${missing.length ? ' -> ' + missing.join(', ') : ''}`);
  console.log(`  extra local : ${extra.length}${extra.length ? ' -> ' + extra.join(', ') : ''}`);

  await page.close();
}

await browser.close();
fs.writeFileSync(
  '/private/tmp/claude-501/-Users-isaac-Documents-Photography-Website/ba0cea59-73fa-4735-ba84-4fe55bbde4a4/scratchpad/audit.json',
  JSON.stringify(report, null, 2)
);

const totalMissing = Object.values(report).reduce((a, r) => a + r.missing.length, 0);
console.log(`\n${totalMissing === 0 ? 'Nothing missing.' : totalMissing + ' PHOTOGRAPHS MISSING'}`);
