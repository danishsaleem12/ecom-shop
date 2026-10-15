'use client';

/**
 * Place at: frontend/src/app/admin/reviews/page.js
 * Moderate customer reviews: hide one (it disappears from the shop and stops counting towards the rating) or delete it.
 *   GET /api/reviews/admin/all?status=&search=&page=&limit= · PATCH /api/reviews/:id/status · DELETE /api/reviews/:id
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { AdminPager, AdminSearchBox, ADMIN_PAGE_SIZES } from '@/components/AdminListTools';
import Stars from '@/components/Stars';
import { API_URL } from '@/lib/imageUrl';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
];

export default function AdminReviewsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [state, setState] = useState('loading');
  const [query, setQuery] = useState({ status: '', search: '', page: 1, limit: ADMIN_PAGE_SIZES[0] });
  const [info, setInfo] = useState({ total: 0, pages: 1, hidden: 0 });
  const [toast, setToast] = useState('');
  const latest = useRef(0); // only the newest request may update the screen

  const { status, search, page, limit } = query;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const mine = ++latest.current;
      if (!silent) setState('loading');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        const res = await fetch(`${API_URL}/api/reviews/admin/all?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (mine !== latest.current) return;
        // The last review on the last page was removed or moved to another filter: step back to a page that exists
        if ((data.reviews || []).length === 0 && page > 1 && data.pages < page) {
          setQuery((q) => ({ ...q, page: data.pages }));
          return;
        }
        setReviews(data.reviews || []);
        setInfo({ total: data.total || 0, pages: data.pages || 1, hidden: data.hidden || 0 });
        setState('ready');
      } catch {
        if (mine === latest.current) setState('error');
      }
    },
    [status, search, page, limit]
  );

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const setSearch = useCallback((text) => setQuery((q) => ({ ...q, search: text, page: 1 })), []);
  const setStatus = (value) => setQuery((q) => ({ ...q, status: value, page: 1 }));
  const goPage = (p) => {
    setQuery((q) => ({ ...q, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const setLimit = (n) => setQuery((q) => ({ ...q, limit: n, page: 1 }));

  const toggle = async (r) => {
    const next = r.status === 'hidden' ? 'published' : 'hidden';
    try {
      const res = await fetch(`${API_URL}/api/reviews/${r._id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('failed');
      setToast(next === 'hidden' ? 'Review hidden' : 'Review is visible again');
      load({ silent: true }); // counts and the filtered list change
    } catch {
      setToast('Could not update the review — try again');
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete the review by ${r.authorName}? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/reviews/${r._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setToast('Review deleted');
      load({ silent: true });
    } catch {
      setToast('Could not delete — try again');
    }
  };

  return (
    <AdminShell title={`Reviews${state === 'ready' ? ` (${info.total.toLocaleString()})` : ''}`}>
      <div className="adm__tabs" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f.value || 'all'} type="button" className={status === f.value ? 'is-active' : ''} aria-pressed={status === f.value} onClick={() => setStatus(f.value)}>
            {f.label}
            {f.value === 'hidden' && info.hidden > 0 ? ` (${info.hidden})` : ''}
          </button>
        ))}
      </div>
      <div className="adm__toolbar">
        <AdminSearchBox onSearch={setSearch} label="Search reviews" placeholder="Search by name or text" />
      </div>

      {state === 'loading' && reviews.length === 0 && <p className="adm__note">Loading reviews…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load reviews. <button type="button" onClick={() => load()}>Retry</button>
        </p>
      )}
      {state === 'ready' && reviews.length === 0 && <p className="adm__note">{search || status ? 'No reviews match.' : 'No reviews yet.'}</p>}

      {state !== 'error' && reviews.length > 0 && (
        <ul className={`adm__list${state === 'loading' ? ' is-busy' : ''}`} aria-busy={state === 'loading'}>
          {reviews.map((r) => (
            <li key={r._id} className={`adm__card${r.status === 'hidden' ? ' is-unread' : ''}`}>
              <div className="adm__cardtop">
                <div>
                  <strong>
                    <Stars value={r.rating} size={15} /> {r.status === 'hidden' && <span className="adm__badge adm__badge--cancelled">Hidden</span>}
                  </strong>
                  <span className="adm__meta">
                    {r.authorName}
                    {r.verifiedPurchase ? ' · Verified purchase' : ''} ·{' '}
                    {r.product?._id ? (
                      <Link href={`/shop/${r.product._id}`} target="_blank">
                        {r.product.name || 'Product'}
                      </Link>
                    ) : (
                      'Deleted product'
                    )}
                  </span>
                </div>
                <span className="adm__meta">{new Date(r.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {r.title && (
                <p className="adm__body">
                  <strong>{r.title}</strong>
                </p>
              )}
              {r.comment ? <p className="adm__body">{r.comment}</p> : !r.title && <p className="adm__meta">(rating only)</p>}
              <div className="adm__foot">
                <span>
                  <button type="button" className="adm__btn adm__btn--ghost" onClick={() => toggle(r)}>
                    {r.status === 'hidden' ? 'Show again' : 'Hide'}
                  </button>
                </span>
                <button type="button" className="adm__btn adm__btn--danger" onClick={() => remove(r)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {info.total > 0 && state !== 'error' && (
        <AdminPager page={page} pages={info.pages} total={info.total} limit={limit} onPage={goPage} onLimit={setLimit} noun="reviews" disabled={state === 'loading'} />
      )}

      {toast && <div className="adm__toast">{toast}</div>}
    </AdminShell>
  );
}
