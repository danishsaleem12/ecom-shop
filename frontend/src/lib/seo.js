// src/lib/seo.js
// Shared helpers for search-engine and share-card data (server side only).
// Used by app/robots.js, app/sitemap.js, app/layout.js, app/shop/[id]/layout.js and app/collections/[slug]/layout.js.
//
// Set NEXT_PUBLIC_SITE_URL to the live address (e.g. https://www.yourstore.com, no trailing slash) in the
// frontend's production environment. Without it robots.txt has no Sitemap line and sitemap.xml is empty,
// because both need absolute addresses.

import { cache } from 'react';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { STORE } from '@/lib/store';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

/** "/shop" -> "https://www.yourstore.com/shop" (just the path when SITE_URL is not set) */
export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Plain one-line text, cut to `max` characters at a word boundary (for descriptions). */
export function snippet(text, max = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/**
 * The `openGraph` block for a page. A page's openGraph REPLACES the one in the root layout (it is not merged),
 * so every page has to repeat the site name, locale and type: this keeps that in one place.
 */
export function openGraphFor({ title, description, path, images }) {
  return {
    type: 'website',
    siteName: STORE.name,
    locale: 'en_PK',
    title,
    ...(description ? { description } : {}),
    ...(path ? { url: path } : {}),
    ...(images?.length ? { images: images.map((url) => ({ url })) } : {}),
  };
}

/** Escapes a JSON-LD object for a <script> tag (a "<" in a product name must not be able to close the tag). */
export const jsonLdString = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

// ---- data from the backend -------------------------------------------------------------------------

/** One product, or null when it doesn't exist / the backend can't be reached. Shared by metadata + JSON-LD of one page. */
export const getProduct = cache(async (id) => {
  try {
    const res = await fetch(`${API_URL}/api/products/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

/** Every product (for sitemap.xml). Empty list when the backend can't be reached. */
export async function getAllProducts() {
  try {
    const res = await fetch(`${API_URL}/api/products`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Cover + gallery photos of a product as absolute addresses, without repeats. */
export const productImages = (product, max = 5) =>
  [...new Set([product.image, ...(product.images || [])].filter(Boolean).map(imageSrc))].slice(0, max);

// ---- structured data (JSON-LD) ---------------------------------------------------------------------

/** schema.org Product + Offer, which is what lets Google show price and "in stock" in search results. */
export function productJsonLd(product, { returnWindowDays } = {}) {
  const url = absoluteUrl(`/shop/${product._id}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: snippet(product.description, 5000),
    sku: String(product._id),
    image: productImages(product),
    ...(product.category && product.category !== 'general' ? { category: product.category } : {}),
    brand: { '@type': 'Brand', name: STORE.name },
    // Lets Google show the stars next to the product in search results (only once there is at least one review)
    ...(product.ratingCount > 0 && product.ratingAverage > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(product.ratingAverage), reviewCount: Number(product.ratingCount), bestRating: 5, worstRating: 1 } }
      : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PKR',
      price: Number(product.price),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      ...(returnWindowDays
        ? {
            hasMerchantReturnPolicy: {
              '@type': 'MerchantReturnPolicy',
              applicableCountry: 'PK',
              returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
              merchantReturnDays: returnWindowDays,
            },
          }
        : {}),
    },
  };
}

/** Home > Shop > Product trail, shown instead of the raw address in search results. */
export const breadcrumbJsonLd = (crumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
});
