/**
 * Place at: frontend/src/app/unsubscribe/page.js   ·   Route: /unsubscribe?email=...&token=...
 * The link in every newsletter email lands here. Kept out of search results.
 */

import { Suspense } from 'react';
import UnsubscribeForm from '@/components/UnsubscribeForm';

export const metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    // useSearchParams() needs a Suspense boundary in the app router
    <Suspense fallback={null}>
      <UnsubscribeForm />
    </Suspense>
  );
}
