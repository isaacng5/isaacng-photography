# Isaac Ng Photography

Static photography portfolio. 90 photographs across four sets, built with Astro, deployed free on Cloudflare Pages.

Replaces a Wix site at `isaacng1.wixsite.com/my-site`.

## Running it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output into dist/
npm run preview    # serve the built site
```

## How the design is put together

Every colour on the site was sampled from the photographs rather than chosen. The site has no colour of its own.

| Token | Value | Where it came from |
| --- | --- | --- |
| `--ground` | `#14100E` | warm shadow average across all 90 files |
| `--ink` | `#E8DED1` | highlight average, deliberately below pure white |
| `--muted` | `#8A7F74` | mid tone |
| `--sodium` | `#C8873F` | the low sun in nearly every frame. Hairlines only |

The single defect the rebuild exists to fix: the Wix site set text to pure `#FFFFFF`, which is brighter than the brightest highlight in any of the photographs, so the word "Portfolio" out shone the sun in the frame. Ink is capped at luminance 223 against a dimmest photo highlight of 96. There is a test for this.

Each album carries its own black point, measured from the shadow tones of the photographs in it. Hong Kong genuinely reads cooler than the UK work, sea haze against winter woodland:

| Album | Ground |
| --- | --- |
| UK & Elsewhere | `#16110C` |
| Hong Kong | `#10151A` |
| Figures | `#131013` |
| Animals | `#17120F` |

**The signature: the page is lit by the photograph you are looking at.** Each photograph stores the average colour of its own brightest eighth, sampled at build time. A slow warmth rises behind whichever frame is under the pointer, in that photograph's own colour.

**Typography.** Archivo Variable does every structural job using its real width axis rather than faked letter spacing. Newsreader Variable appears only where there is continuous reading, which is the About essay. The rule is that the serif never appears above 20px, which inverts the usual serif display plus sans body convention.

**Layout.** Justified rows where each item's flex basis and flex grow are both proportional to its aspect ratio, so widths within a row stay proportional to ratio and every height in that row comes out equal. Nothing is ever cropped.

## Photographs

Source files live in `originals/` (283MB, git ignored). `npm run photos` normalises them to 2560px long edge into `src/photos/` (61MB, committed), samples each photograph's light, and writes `src/data/photos.json`.

Only rerun it if the originals change. The output is committed so Cloudflare never touches `originals/`.

```
src/data/albums.ts     hand written: titles, grounds, covers, notes
src/data/alt-text.ts   hand written: 90 alt strings, keyed by photo id
src/data/photos.json   GENERATED: dimensions and sampled light
src/data/photos.ts     joins the three and wires Astro's image pipeline
```

Adding or removing a photograph means rerunning `npm run photos` and adding its alt string. The build fails loudly if an alt string is missing, rather than shipping an unlabelled image.

## Deploying

Cloudflare Pages, connected to this GitHub repo:

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Astro

Every push to `main` redeploys. Pull requests get preview URLs.

## Known state

- 45 of the 90 files were already capped at 2560px by Wix on upload, and all EXIF was stripped. If the original Nikon Z6ii files still exist, re exporting them is a drop in replacement.
- Contact is Instagram only. A form needs a backend, which means a Worker plus DNS once there is a custom domain.
- No custom domain yet.

## Tests

`node verify.mjs` against a running preview checks text contrast at AA, that no text out shines the album's own highlights, lightbox keyboard navigation and focus restoration, reduced motion compliance, and that every image carries explicit dimensions so CLS stays at zero.
