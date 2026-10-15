'use client';

/**
 * Place at: frontend/src/components/AdminListTools.js
 * Small pieces shared by the admin list pages (Orders, Subscribers, Products):
 *   <AdminSearchBox onSearch={(text) => …} />   a search field that reports its text a moment after typing stops
 *   <AdminPager page pages total limit onPage />  "Showing 21–40 of 134" + Previous / 1 2 3 … / Next
 *   ADMIN_PAGE_SIZES                             the page sizes the lists offer
 * The styles live here (prefix admt__) so the pieces look the same on pages that use AdminShell and on the
 * Products page, which has its own styles.
 */

import { useEffect, useRef, useState } from 'react';
import './styles/AdminListTools.css';

export const ADMIN_PAGE_SIZES = [20, 50, 100];

/** Search field. `onSearch` gets the trimmed text ~350 ms after the last keystroke (immediately on Enter or ✕). */
export function AdminSearchBox({ onSearch, placeholder = 'Search…', label = 'Search', delay = 350, initial = '' }) {
  const [value, setValue] = useState(initial);
  const timer = useRef(null);
  const last = useRef(initial.trim());

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (text) => {
    clearTimeout(timer.current);
    const clean = text.trim();
    if (clean === last.current) return; // nothing new to search for
    last.current = clean;
    onSearch(clean);
  };

  return (
    <form
      className="admt__search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        commit(value);
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(e.target.value), delay);
        }}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          className="admt__clear"
          aria-label="Clear search"
          onClick={() => {
            setValue('');
            commit('');
          }}
        >
          ×
        </button>
      )}
    </form>
  );
}

// 1 … 4 5 [6] 7 8 … 20  (always the first and last page, and two on each side of the current one)
function pageNumbers(page, pages) {
  const keep = new Set([1, pages]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= pages) keep.add(p);
  const sorted = [...keep].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

/** Page buttons plus a "Showing a–b of n" line. Renders nothing when there are no results. */
export function AdminPager({ page, pages, total, limit, onPage, onLimit, noun = 'results', disabled = false }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <nav className="admt__pager" aria-label="Pagination">
      <p className="admt__count">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {noun}
      </p>

      {pages > 1 && (
        <div className="admt__pages">
          <button type="button" onClick={() => onPage(page - 1)} disabled={disabled || page <= 1}>
            ‹ Previous
          </button>
          {pageNumbers(page, pages).map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="admt__gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={p === page ? 'is-current' : ''}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                onClick={() => onPage(p)}
                disabled={disabled}
              >
                {p}
              </button>
            )
          )}
          <button type="button" onClick={() => onPage(page + 1)} disabled={disabled || page >= pages}>
            Next ›
          </button>
        </div>
      )}

      {onLimit && (
        <label className="admt__size">
          Per page
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} disabled={disabled}>
            {ADMIN_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}

