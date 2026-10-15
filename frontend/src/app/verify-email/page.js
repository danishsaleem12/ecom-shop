/**
 * Route: /verify-email?token=...   (the link in the sign-up confirmation email)
 * Kept out of search results.
 */

import { Suspense } from 'react';
import VerifyEmailForm from '@/components/VerifyEmailForm';

export const metadata = {
  title: 'Confirm your email',
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    // useSearchParams() needs a Suspense boundary in the app router
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
