import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://isaacng-photography.pages.dev',
  // Source photos are already normalised to 2560px long edge by
  // scripts/prepare-photos.mjs, so nothing here ever needs to upscale.
  // Emit /about.html rather than /about/index.html so the built filenames match
  // the hrefs used across the site exactly. Workers then serves every internal
  // link directly, with no trailing slash redirect hop in between.
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'auto',
  },
});
