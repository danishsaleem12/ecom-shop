/**
 * frontend/src/lib/collections.js
 *
 * The single source of truth for collection copy/images — the marketing
 * groupings ("Spring / Summer", "Evening", ...), NOT product data. Each
 * `slug` here is what gets tagged onto products via Product.collections
 * in the backend, and what /collections/[slug]/page.js reads from the URL.
 *
 * CollectionsList.js should import { CATEGORIES, COLLECTIONS } from here
 * instead of declaring its own local copies — replace its two local
 * consts with:
 *   import { CATEGORIES, COLLECTIONS } from '@/lib/collections';
 * Everything else in that file stays the same.
 */

const IMG = '/images/collections';

export const CATEGORIES = [
  {
    id: 'seasonal',
    label: 'Seasonal',
    caption: 'Inspired by the seasons, designed for you.',
    href: '/collections/seasonal',
    items: [
      { title: 'Spring / Summer', slug: 'spring-summer' },
      { title: 'Resort Edit', slug: 'resort' },
      { title: 'Linen Season', slug: 'linen' },
      { title: 'Autumn / Winter', slug: 'autumn-winter' },
    ],
  },
  {
    id: 'occasions',
    label: 'Occasions',
    caption: "For life's most beautiful moments.",
    href: '/collections/occasions',
    items: [
      { title: 'Evening', slug: 'evening' },
      { title: 'Wedding Guest', slug: 'wedding-guest' },
      { title: 'Travel', slug: 'travel' },
      { title: 'Everyday Essentials', slug: 'everyday-essentials' },
    ],
  },
  {
    id: 'featured',
    label: 'Featured',
    caption: 'Our most-loved and exclusive pieces.',
    href: '/collections/featured',
    items: [
      { title: 'Sun-Washed Neutrals', slug: 'sun-washed-neutrals' },
      { title: 'The Evening Collection', slug: 'evening-collection' },
    ],
  },
];

export const COLLECTIONS = [
  {
    slug: 'spring-summer',
    category: 'Seasonal',
    title: 'Spring / Summer',
    description: 'Light fabrics, soft colors and effortless silhouettes for warmer days and longer evenings.',
    href: '/collections/spring-summer',
    image: `${IMG}/spring-summer.jpg`,
    tint: ['#c9ad86', '#332a1a'],
    thumbs: [
      { image: `${IMG}/spring-summer-detail-1.jpg`, tint: ['#e4d9bf', '#3a2f1d'] },
      { image: `${IMG}/spring-summer-detail-2.jpg`, tint: ['#d7c39a', '#362b19'] },
      { image: `${IMG}/spring-summer-detail-3.jpg`, tint: ['#c2a06a', '#2c2213'] },
    ],
  },
  {
    slug: 'evening',
    category: 'Occasion',
    title: 'Evening',
    description: 'Refined silhouettes and luxurious details for your most special moments.',
    href: '/collections/evening',
    image: `${IMG}/evening.jpg`,
    tint: ['#6b4a3c', '#1c1310'],
    thumbs: [
      { image: `${IMG}/evening-detail-1.jpg`, tint: ['#3a2620', '#120b09'] },
      { image: `${IMG}/evening-detail-2.jpg`, tint: ['#4a2f26', '#150e0b'] },
      { image: `${IMG}/evening-detail-3.jpg`, tint: ['#5c3a2c', '#19110c'] },
    ],
  },
  {
    slug: 'sun-washed-neutrals',
    category: 'Featured',
    title: 'Sun-Washed Neutrals',
    description: 'Timeless tones. Effortless elegance. A collection made for earthy days and golden hours.',
    href: '/collections/sun-washed-neutrals',
    image: `${IMG}/sun-washed-neutrals.jpg`,
    tint: ['#b89b76', '#33281d'],
    thumbs: [
      { image: `${IMG}/sun-washed-neutrals-detail-1.jpg`, tint: ['#d8c7a6', '#372c1c'] },
      { image: `${IMG}/sun-washed-neutrals-detail-2.jpg`, tint: ['#c4ac81', '#2e2416'] },
      { image: `${IMG}/sun-washed-neutrals-detail-3.jpg`, tint: ['#ae9066', '#261e13'] },
    ],
  },
  {
    slug: 'evening-collection',
    category: 'Featured',
    title: 'The Evening Collection',
    description: 'Rich textures, elegant drapes and timeless pieces for unforgettable nights.',
    href: '/collections/evening-collection',
    image: `${IMG}/evening-collection.jpg`,
    tint: ['#5a3f35', '#170f0c'],
    thumbs: [
      { image: `${IMG}/evening-collection-detail-1.jpg`, tint: ['#6e4a3a', '#1b1109'] },
      { image: `${IMG}/evening-collection-detail-2.jpg`, tint: ['#4a2e28', '#140d0a'] },
      { image: `${IMG}/evening-collection-detail-3.jpg`, tint: ['#7c3f42', '#1c0f10'] },
    ],
  },
  {
    slug: 'resort',
    category: 'Seasonal',
    title: 'Resort Edit',
    description: 'Quiet tailoring and warm-weather ease, made for sun-soaked escapes.',
    href: '/collections/resort',
    image: `${IMG}/resort.jpg`,
    tint: ['#a08462', '#33271d'],
    thumbs: [
      { image: `${IMG}/resort-detail-1.jpg`, tint: ['#cbb287', '#372b1a'] },
      { image: `${IMG}/resort-detail-2.jpg`, tint: ['#b89a6c', '#2d2314'] },
      { image: `${IMG}/resort-detail-3.jpg`, tint: ['#9c8058', '#241b10'] },
    ],
  },
  {
    slug: 'linen',
    category: 'Seasonal',
    title: 'Linen Season',
    description: 'Breathable linen and soft silk, made for long days in the heat.',
    href: '/collections/linen',
    image: `${IMG}/linen.jpg`,
    tint: ['#9b8b74', '#2b241d'],
    thumbs: [
      { image: `${IMG}/linen-detail-1.jpg`, tint: ['#d6cbb4', '#362f22'] },
      { image: `${IMG}/linen-detail-2.jpg`, tint: ['#beae90', '#2e281c'] },
      { image: `${IMG}/linen-detail-3.jpg`, tint: ['#a4956f', '#241f15'] },
    ],
  },
  {
    slug: 'autumn-winter',
    category: 'Seasonal',
    title: 'Autumn / Winter',
    description: 'Warm textures and deeper tones for the cooler months ahead.',
    href: '/collections/autumn-winter',
    image: `${IMG}/autumn-winter.jpg`,
    tint: ['#7a4b32', '#251710'],
    thumbs: [
      { image: `${IMG}/autumn-winter-detail-1.jpg`, tint: ['#8f5c3a', '#2a1a10'] },
      { image: `${IMG}/autumn-winter-detail-2.jpg`, tint: ['#6b4128', '#1c110a'] },
      { image: `${IMG}/autumn-winter-detail-3.jpg`, tint: ['#a06f45', '#2c2013'] },
    ],
  },
  {
    slug: 'wedding-guest',
    category: 'Occasion',
    title: 'Wedding Guest',
    description: 'Elegant, considered pieces that never overdress the moment.',
    href: '/collections/wedding-guest',
    image: `${IMG}/wedding-guest.jpg`,
    tint: ['#a48d7d', '#2d221b'],
    thumbs: [
      { image: `${IMG}/wedding-guest-detail-1.jpg`, tint: ['#c8b3a0', '#352a20'] },
      { image: `${IMG}/wedding-guest-detail-2.jpg`, tint: ['#b39c88', '#2c2117'] },
      { image: `${IMG}/wedding-guest-detail-3.jpg`, tint: ['#8e7563', '#211a13'] },
    ],
  },
  {
    slug: 'travel',
    category: 'Occasion',
    title: 'Travel',
    description: 'Effortless separates that pack light and move easily.',
    href: '/collections/travel',
    image: `${IMG}/travel.jpg`,
    tint: ['#6d735c', '#1f211a'],
    thumbs: [
      { image: `${IMG}/travel-detail-1.jpg`, tint: ['#8d9375', '#242618'] },
      { image: `${IMG}/travel-detail-2.jpg`, tint: ['#767c62', '#1e2017'] },
      { image: `${IMG}/travel-detail-3.jpg`, tint: ['#5c6249', '#181a12'] },
    ],
  },
  {
    slug: 'everyday-essentials',
    category: 'Occasion',
    title: 'Everyday Essentials',
    description: 'The quiet basics you will reach for daily.',
    href: '/collections/everyday-essentials',
    image: `${IMG}/everyday-essentials.jpg`,
    tint: ['#8c7a68', '#28201a'],
    thumbs: [
      { image: `${IMG}/everyday-essentials-detail-1.jpg`, tint: ['#b19d87', '#302820'] },
      { image: `${IMG}/everyday-essentials-detail-2.jpg`, tint: ['#9a8873', '#271f18'] },
      { image: `${IMG}/everyday-essentials-detail-3.jpg`, tint: ['#7c6c5a', '#1e1811'] },
    ],
  },
];

/** Look up one collection by its slug — used by /collections/[slug]/page.js */
export const getCollectionBySlug = (slug) => COLLECTIONS.find((c) => c.slug === slug) || null;

/** Flat list of every valid slug — handy for the admin form's checkboxes. */
export const COLLECTION_SLUGS = COLLECTIONS.map((c) => ({ slug: c.slug, title: c.title }));