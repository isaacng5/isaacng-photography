import type { ImageMetadata } from 'astro';
import manifest from './photos.json';
import { altText } from './alt-text';
import { albums } from './albums';

export interface Photo {
  id: string;
  album: string;
  file: string;
  width: number;
  height: number;
  /** Average colour of this photograph's brightest eighth. Drives the ambient warmth. */
  light: string;
  alt: string;
  src: ImageMetadata;
  /** Width divided by height, used to lay out justified rows without cropping. */
  ratio: number;
}

const assets = import.meta.glob<{ default: ImageMetadata }>('/src/photos/**/*.jpg', {
  eager: true,
});

function asset(album: string, file: string): ImageMetadata {
  const key = `/src/photos/${album}/${file}`;
  const found = assets[key];
  if (!found) throw new Error(`Missing image ${key}. Run: npm run photos`);
  return found.default;
}

export const photos: Photo[] = manifest.map((p) => {
  const alt = altText[p.id];
  if (!alt) throw new Error(`Missing alt text for ${p.id} in src/data/alt-text.ts`);
  return {
    ...p,
    alt,
    src: asset(p.album, p.file),
    ratio: p.width / p.height,
  };
});

const byId = new Map(photos.map((p) => [p.id, p]));

export function photo(id: string): Photo {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown photo id: ${id}`);
  return found;
}

export function photosIn(album: string): Photo[] {
  return photos.filter((p) => p.album === album);
}

export const siteImages = {
  isaac: asset('site', 'isaac.jpg'),
};

/** Album slug -> its photos, in manifest order. */
export const albumPhotos = new Map(albums.map((a) => [a.slug, photosIn(a.slug)]));
