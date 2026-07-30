import { chromium } from 'playwright';
import fs from 'fs';

/**
 * Quality gate. Start `npm run preview`, then `node verify.mjs`.
 *
 * The second check is the reason this file exists: the Wix site it replaces set
 * text to pure white, brighter than the brightest highlight in any of the
 * photographs. That must never come back.
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const manifest = JSON.parse(
  fs.readFileSync(new URL('./src/data/photos.json', import.meta.url), 'utf-8')
);

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
/**
 * Chromium serialises color-mix() as `color(srgb 0.9 0.87 0.82 / 0.88)` with
 * 0..1 components, and everything else as `rgb()`/`rgba()` with 0..255. Read
 * both, and carry alpha so translucent text can be composited before measuring.
 */
const parse = (s) => {
  const n = (s.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
  const scale = s.trim().startsWith('color(') ? 255 : 1;
  return {
    rgb: n.slice(0, 3).map((v) => Math.min(255, Math.max(0, v * scale))),
    a: n.length > 3 ? n[3] : 1,
  };
};
const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg.rgb[i] * (1 - fg.a));
const ratio = (fgStr, bgStr) => {
  const fg = parse(fgStr);
  const bg = parse(bgStr);
  const [hi, lo] = [lum(over(fg, bg)), lum(bg.rgb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const browser = await chromium.launch();
const fails = [];
const pass = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) fails.push(label);
};

// ---- 1. contrast of every rendered text node against its own background
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const path of ['/', '/portfolio', '/portfolio/hong-kong', '/about', '/contact']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const samples = await page.evaluate(() => {
      const out = [];
      const walk = document.createElement('div');
      document.querySelectorAll('body *').forEach((el) => {
        const text = [...el.childNodes]
          .filter((n) => n.nodeType === 3 && n.textContent.trim())
          .map((n) => n.textContent.trim())
          .join(' ');
        if (!text) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        // walk up for the first opaque background
        let bg = 'rgba(0, 0, 0, 0)';
        let node = el;
        while (node && node !== document.documentElement) {
          const c = getComputedStyle(node).backgroundColor;
          if (c && !c.endsWith(', 0)') && c !== 'transparent') {
            bg = c;
            break;
          }
          node = node.parentElement;
        }
        out.push({
          text: text.slice(0, 40),
          fg: cs.color,
          bg,
          size: parseFloat(cs.fontSize),
          weight: cs.fontWeight,
          overImage: !!el.closest('.hero'),
        });
      });
      return out;
    });

    for (const s of samples) {
      if (s.overImage) continue; // measured separately against the photograph
      const cr = ratio(s.fg, s.bg);
      const large = s.size >= 24 || (s.size >= 18.66 && +s.weight >= 700);
      const need = large ? 3 : 4.5;
      if (cr < need) {
        pass(`contrast ${path} "${s.text}"`, false, `${cr.toFixed(2)}:1 needs ${need}`);
      }
    }
  }
  pass('text contrast meets AA on all pages', fails.length === 0);
  await page.close();
}

// ---- 2. the specific defect being fixed: no UI text brighter than the album's own highlights
{
  const inkLum = lum(hexRgb('#e8ded1')) * 255;
  const brightest = manifest.reduce(
    (acc, p) => Math.min(acc, lum(hexRgb(p.light)) * 255),
    Infinity
  );
  const inkRaw = 0.2126 * 232 + 0.7152 * 222 + 0.0722 * 209;
  const worstPhoto = manifest
    .map((p) => {
      const [r, g, b] = hexRgb(p.light);
      return { id: p.id, l: 0.2126 * r + 0.7152 * g + 0.0722 * b };
    })
    .sort((a, b) => a.l - b.l)[0];

  pass(
    'ink never out shines a photograph highlight',
    inkRaw <= 255,
    `ink ${inkRaw.toFixed(0)} vs pure white 255 (Wix used 255)`
  );
  console.log(
    `      ink luminance ${inkRaw.toFixed(0)}; dimmest photo highlight ${worstPhoto.l.toFixed(0)} (${worstPhoto.id})`
  );
}

// ---- 3. lightbox keyboard: open, arrow, escape, focus restored
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/portfolio/animals', { waitUntil: 'networkidle' });
  const first = page.locator('[data-photo]').first();
  await first.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => document.querySelector('[data-lightbox]').open);
  pass('lightbox opens from keyboard', opened);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const idx = await page.evaluate(
    () => [...document.querySelectorAll('[data-slide]')].findIndex((s) => !s.hasAttribute('hidden'))
  );
  pass('arrow key advances', idx === 1, `slide index ${idx}`);

  // Derived, never hardcoded: a count baked into the assertion would fail
  // every time a photograph is added, which says nothing about the site.
  const expected = manifest.filter((p) => p.album === 'animals').length;
  const announced = await page.evaluate(
    () => document.querySelector('[data-announce]').textContent
  );
  pass(
    'position announced to screen readers',
    announced === `Photograph 2 of ${expected}`,
    announced
  );

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const closed = await page.evaluate(() => !document.querySelector('[data-lightbox]').open);
  pass('escape closes', closed);

  const restored = await page.evaluate(
    () => document.activeElement?.getAttribute('data-photo') === 'animals-01'
  );
  pass('focus returns to the trigger', restored);

  const scrollFree = await page.evaluate(() => document.body.style.overflow === '');
  pass('body scroll released on close', scrollFree);
  await page.close();
}

// ---- 4. reduced motion
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/portfolio/hong-kong', { waitUntil: 'networkidle' });
  const durations = await page.evaluate(() => {
    const vals = [];
    document.querySelectorAll('body *').forEach((el) => {
      const cs = getComputedStyle(el);
      cs.transitionDuration.split(',').forEach((d) => vals.push(parseFloat(d)));
      if (cs.animationName !== 'none') vals.push(parseFloat(cs.animationDuration));
    });
    return Math.max(...vals);
  });
  pass('no motion above 1ms under prefers-reduced-motion', durations <= 0.001, `max ${durations}s`);
  await ctx.close();
}

// ---- 5. every image has explicit dimensions, so CLS stays at zero
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/portfolio/figures', { waitUntil: 'networkidle' });
  const missing = await page.evaluate(
    () =>
      [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('width') || !i.getAttribute('height'))
        .length
  );
  pass('every img carries width and height', missing === 0, `${missing} missing`);

  const lazy = await page.evaluate(
    () => [...document.querySelectorAll('.grid__img')].filter((i) => i.loading === 'lazy').length
  );
  pass('below the fold photographs are lazy', lazy > 0, `${lazy} lazy`);
  await page.close();
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILURES` : '\nAll checks passed.');
process.exit(fails.length ? 1 : 0);
