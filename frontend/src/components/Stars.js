'use client';

import './styles/Stars.css';

/**
 * Place at: frontend/src/components/Stars.js
 * Read-only star rating: five stars, filled to `value` (partial values fill part of a star, e.g. 4.3).
 *   <Stars value={4.3} />                       just the stars
 *   <Stars value={4.3} count={12} showValue />  "★★★★☆ 4.3 (12)"
 * Screen readers get "Rated 4.3 out of 5 from 12 reviews"; the drawn stars are hidden from them.
 */

const STAR = 'M12 2.5l2.94 6.1 6.66.9-4.88 4.64 1.22 6.62L12 17.5l-5.94 3.26 1.22-6.62L2.4 9.5l6.66-.9L12 2.5z';

function Row({ size, filled }) {
  return (
    <span className="aur-stars__row">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={filled ? 'is-full' : 'is-empty'}>
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

export default function Stars({ value = 0, count, size = 16, showValue = false, className = '' }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const label =
    count === undefined
      ? `Rated ${v.toFixed(1)} out of 5`
      : count === 0
        ? 'No reviews yet'
        : `Rated ${v.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'review' : 'reviews'}`;

  // 5 stars of `size` with a 2px gap: the filled row is cut off at the right percentage of that width
  const gap = 2;
  const full = size * 5 + gap * 4;
  const cut = Math.round(((v * size + Math.floor(v) * gap) / full) * 1000) / 10; // % of the row

  return (
    <span className={`aur-stars ${className}`} role="img" aria-label={label}>
      <span className="aur-stars__stack" aria-hidden="true">
        <Row size={size} />
        <span className="aur-stars__clip" style={{ width: `${Math.min(100, cut)}%` }}>
          <Row size={size} filled />
        </span>
      </span>
      {showValue && count !== 0 && (
        <span className="aur-stars__text" aria-hidden="true">
          {v.toFixed(1)}
          {count !== undefined && <span> ({count})</span>}
        </span>
      )}

    </span>
  );
}
