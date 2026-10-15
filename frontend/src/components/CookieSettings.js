'use client';

// frontend/src/components/CookieSettings.js — "Cookie settings" button for the Privacy Policy.
// Reopens the cookie notice so a visitor can change their choice. Shows nothing when analytics is off.
import { GA_ID, OPEN_SETTINGS_EVENT } from '@/lib/analytics';

export default function CookieSettings() {
  if (!GA_ID) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT))}
      style={{ marginTop: 8, padding: '10px 20px', borderRadius: 999, border: '1px solid currentColor', background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
    >
      Cookie settings
    </button>
  );
}
