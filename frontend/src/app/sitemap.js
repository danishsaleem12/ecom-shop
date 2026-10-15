// Place at: frontend/src/app/sitemap.js  ->  served as /sitemap.xml
// Lists every public page: the main pages, each collection and every product (with its last-updated date).
// Products come from the backend (GET /api/products) and are refreshed hourly. If the backend is down, the sitemap
// still lists the fixed pages.
import { SITE_URL, absoluteUrl, getAllProducts } from '@/lib/seo';
import { CATEGORIES, COLLECTIONS } from '@/lib/collections';

export const revalidate = 3600;

const PAGES = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
  { path: '/collections', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/help', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/size-guide', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/care', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/shipping', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap() {
  if (!SITE_URL) return []; // sitemap addresses must be absolute: set NEXT_PUBLIC_SITE_URL

  const collectionPaths = [...CATEGORIES.map((c) => c.href), ...COLLECTIONS.map((c) => c.href)];
  const products = await getAllProducts();

  return [
    ...PAGES.map((p) => ({ url: absoluteUrl(p.path), changeFrequency: p.changeFrequency, priority: p.priority })),
    ...collectionPaths.map((path) => ({ url: absoluteUrl(path), changeFrequency: 'weekly', priority: 0.7 })),
    ...products.map((p) => ({
      url: absoluteUrl(`/shop/${p._id}`),
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
  ];
}
