'use client';

/**
 * Place at: frontend/src/components/VerifyEmailNotice.js
 * A small box for a signed-in customer who has not yet confirmed their email: says where the link was sent and
 * lets them ask for a new one. Renders nothing for everyone else (signed out, confirmed, or accounts that predate
 * email verification), so it is safe to drop on any page.
 *   POST /api/auth/resend-verification
 */

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/imageUrl';
import './styles/VerifyEmailNotice.css';

export default function VerifyEmailNotice() {
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });

  if (!user || user.emailVerified !== false) return null;

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    setMessage({ text: '', error: false });
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'We could not send the email. Please try again.');
      if (data.alreadyVerified) await refresh(); // confirmed in another tab: hide this box
      setMessage({ text: data.message || 'Email sent.', error: false });
    } catch (err) {
      setMessage({ text: err.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aur-verify" role="status">
      <p className="aur-verify__title">Please confirm your email</p>
      <p className="aur-verify__text">
        We sent a confirmation link to <strong>{user.email}</strong>. Open it to finish setting up your account. You need to confirm before you can place an
        order. Check your spam folder if you can&apos;t find it.
      </p>
      <div className="aur-verify__actions">
        <button type="button" onClick={resend} disabled={busy}>
          {busy ? 'Sending…' : 'Resend email'}
        </button>
        <button type="button" className="aur-verify__ghost" onClick={refresh}>
          I&apos;ve confirmed it
        </button>
      </div>
      {message.text && <p className={`aur-verify__msg ${message.error ? 'is-error' : ''}`}>{message.text}</p>}

    </div>
  );
}
