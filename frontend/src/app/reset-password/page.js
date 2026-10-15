/**
 * Route: /reset-password?token=...   (the link in the password-reset email)
 * Kept out of search results.
 */

import { Suspense } from 'react';
import ResetPasswordForm from '@/components/ResetPasswordForm';

export const metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    // useSearchParams() needs a Suspense boundary in the app router
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
