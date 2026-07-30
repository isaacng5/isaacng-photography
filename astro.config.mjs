import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://isaacng-photography.pages.dev',
  // Source photos are already normalised to 2560px long edge by
  // scripts/prepare-photos.mjs, so nothing here ever needs to upscale.
  build: {
    inlineStylesheets: 'auto',
  },
});
