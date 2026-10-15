// Place at: frontend/src/app/robots.js  ->  served as /robots.txt
// Tells search engines what NOT to crawl: the admin area, accounts, the bag and checkout, and other private pages.
import { SITE_URL, absoluteUrl } from '@/lib/seo';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/account',
          '/cart',
          '/checkout',
          '/order-success',
          '/track-order',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/wishlist',
          '/unsubscribe',
        ],
      },
    ],
    // Needs an absolute address, so it is only listed once NEXT_PUBLIC_SITE_URL is set
    ...(SITE_URL ? { sitemap: absoluteUrl('/sitemap.xml'), host: SITE_URL } : {}),
  };
}
