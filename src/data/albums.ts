/**
 * Hand authored album content. Generated per photo data lives in photos.json.
 *
 * `ground` is each album's own black point, measured from the shadow tones of
 * the photographs in it and then nudged just far enough to be perceptible.
 * Hong Kong genuinely reads cooler than the UK work: sea haze against winter
 * woodland. The site takes its colour from the photographs, not the other way round.
 *
 * Covers are all landscape and all within a hair of 3:2, so the index bands
 * come out the same height without the frame having to crop anything.
 */
export interface Album {
  slug: string;
  title: string;
  /** Measured black point for this album. */
  ground: string;
  /** Photo id used as the index cover. */
  cover: string;
  /** One line, shown under the title on the index. */
  note: string;
}

export const albums: Album[] = [
  {
    slug: 'uk-and-elsewhere',
    title: 'UK & Elsewhere',
    ground: '#16110C',
    cover: 'uk-and-elsewhere-17',
    note: 'Winter light in London, Cardiff and the coast. Mostly shot into the sun.',
  },
  {
    slug: 'hong-kong',
    title: 'Hong Kong',
    ground: '#10151A',
    cover: 'hong-kong-03',
    note: 'Home, in the humid haze that never quite lifts off the harbour.',
  },
  {
    slug: 'figures',
    title: 'Figures',
    ground: '#131013',
    cover: 'figures-01',
    note: 'People as shapes in light. Almost nobody here is facing the camera.',
  },
  {
    slug: 'animals',
    title: 'Animals',
    ground: '#17120F',
    cover: 'animals-07',
    note: 'Birds on railings, cats indoors, whatever held still long enough.',
  },
];

export const albumBySlug = new Map(albums.map((a) => [a.slug, a]));

/** Home page hero: silhouetted figures walking into low winter sun. */
export const HERO_ID = 'uk-and-elsewhere-17';

export const SITE = {
  name: 'Isaac Ng',
  role: 'Photography',
  instagram: 'portrait_ing',
  instagramUrl: 'https://www.instagram.com/portrait_ing',
  camera: 'Nikon Z6ii',
} as const;
