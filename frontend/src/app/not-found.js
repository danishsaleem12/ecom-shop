/**
 * Place at: frontend/src/app/not-found.js
 * Shown for any address that does not exist, and whenever a page calls notFound().
 */

import StatusPage from '@/components/StatusPage';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="This page has wandered off"
      text="The page you are looking for may have moved, sold out, or never existed. Let's get you back to something beautiful."
      primary={{ label: 'Back to home', href: '/' }}
      secondary={{ label: 'Browse the shop', href: '/shop' }}
      links={[
        { label: 'Track an order', href: '/track-order' },
        { label: 'Help & returns', href: '/help' },
        { label: 'Contact us', href: '/contact' },
      ]}
    />
  );
}
