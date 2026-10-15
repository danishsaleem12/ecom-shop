'use client';

/**
 * Place at: frontend/src/app/admin/subscribers/page.js
 * Newsletter signups from the footer and the homepage banner. Paged and searchable by email.
 *   GET /api/subscribe?search=&page=&limit= · DELETE /api/subscribe/:id
 *   GET /api/subscribe/export?search=  (the CSV: everyone matching the search, not just the page on screen)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { AdminPager, AdminSearchBox, ADMIN_PAGE_SIZES } from '@/components/AdminListTools';
import { API_URL } from '@/lib/imageUrl';

export default function AdminSubscribersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [subs, setSubs] = useState([]);
  const [state, setState] = useState('loading');
  const [query, setQuery] = useState({ search: '', page: 1, limit: ADMIN_PAGE_SIZES[0] });
  const [info, setInfo] = useState({ total: 0, pages: 1 });
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const latest = useRef(0); // only the newest request may update the screen

  const { search, page, limit } = query;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const mine = ++latest.current;
      if (!silent) setState('loading');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set('search', search);
        const res = await fetch(`${API_URL}/api/subscribe?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (mine !== latest.current) return;
        // The last subscriber on the last page was removed: step back to a page that exists
        if ((data.subscribers || []).length === 0 && page > 1 && data.pages < page) {
          setQuery((q) => ({ ...q, page: data.pages }));
          return;
        }
        setSubs(data.subscribers || []);
        setInfo({ total: data.total || 0, pages: data.pages || 1 });
        setState('ready');
      } catch {
        if (mine === latest.current) setState('error');
      }
    },
    [search, page, limit]
  );

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  const setSearch = useCallback((text) => setQuery((q) => ({ ...q, search: text, page: 1 })), []);
  const goPage = (p) => {
    setQuery((q) => ({ ...q, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const setLimit = (n) => setQuery((q) => ({ ...q, limit: n, page: 1 }));

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.email} from the list?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/subscribe/${s._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setToast('Subscriber removed');
      load({ silent: true }); // the totals and the page contents shift up
    } catch {
      setToast('Could not remove — try again');
    }
  };

  // The CSV comes from the server so it holds EVERY subscriber matching the search, not only this page
  const downloadCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/api/subscribe/export?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subscribers.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast('Could not download the CSV — try again');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminShell
      title={`Subscribers${state !== 'error' && (state === 'ready' || subs.length > 0) ? ` (${info.total.toLocaleString()})` : ''}`}
      actions={
        <button type="button" className="adm__btn" onClick={downloadCsv} disabled={exporting || info.total === 0}>
          {exporting ? 'Preparing…' : search ? 'Download CSV (matches)' : 'Download CSV'}
        </button>
      }
    >
      <div className="adm__toolbar">
        <AdminSearchBox onSearch={setSearch} label="Search subscribers" placeholder="Search by email" />
      </div>

      {state === 'loading' && subs.length === 0 && <p className="adm__note">Loading subscribers…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load subscribers. <button type="button" onClick={() => load()}>Retry</button>
        </p>
      )}
      {state === 'ready' && subs.length === 0 && <p className="adm__note">{search ? `No subscribers match “${search}”.` : 'No subscribers yet.'}</p>}

      {state !== 'error' && subs.length > 0 && (
        <div className={`adm__table${state === 'loading' ? ' is-busy' : ''}`} aria-busy={state === 'loading'}>
          <div className="adm__row adm__row--head">
            <span>Email</span>
            <span>Joined</span>
            <span />
          </div>
          {subs.map((s) => (
            <div className="adm__row" key={s._id}>
              <span>{s.email}</span>
              <span>{new Date(s.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <button type="button" className="adm__btn adm__btn--danger" onClick={() => remove(s)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {state !== 'error' && (
        <AdminPager
          page={page}
          pages={info.pages}
          total={info.total}
          limit={limit}
          onPage={goPage}
          onLimit={setLimit}
          noun="subscribers"
          disabled={state === 'loading'}
        />
      )}

      {toast && <div className="adm__toast">{toast}</div>}
    </AdminShell>
  );
}
