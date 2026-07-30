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
/**
 * No descriptions. The photographs are the content; a title and a count are
 * all the signposting a visitor needs to choose where to go.
 */
export interface Album {
  slug: string;
  title: string;
  /** Measured black point for this album. */
  ground: string;
  /** Photo id used as the index cover. */
  cover: string;
}

export const albums: Album[] = [
  {
    slug: 'uk-and-elsewhere',
    title: 'UK & Elsewhere',
    ground: '#16110C',
    cover: 'uk-and-elsewhere-17',
  },
  {
    slug: 'hong-kong',
    title: 'Hong Kong',
    ground: '#10151A',
    cover: 'hong-kong-03',
  },
  {
    slug: 'figures',
    title: 'Figures',
    ground: '#131013',
    cover: 'figures-01',
  },
  {
    slug: 'animals',
    title: 'Animals',
    ground: '#17120F',
    cover: 'animals-07',
  },
];

export const albumBySlug = new Map(albums.map((a) => [a.slug, a]));

/** Home page hero: silhouetted figures walking into low winter sun. */
export const HERO_ID = 'uk-and-elsewhere-17';

/**
 * What the home page scrolls into. Nine frames across all four sets, no
 * heading and no captions, chosen because each one is a dark shape against
 * light, which is what nearly every photograph here is doing.
 */
export const SELECTED = [
  'animals-07',
  'hong-kong-12',
  'figures-05',
  'uk-and-elsewhere-01',
  'hong-kong-11',
  'figures-17',
  'uk-and-elsewhere-12',
  'hong-kong-15',
  'animals-03',
] as const;

export const SITE = {
  name: 'Isaac Ng',
  role: 'Photography',
  instagram: 'portrait_ing',
  instagramUrl: 'https://www.instagram.com/portrait_ing',
  camera: 'Nikon Z6ii',
} as const;
