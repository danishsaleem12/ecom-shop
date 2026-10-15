'use client';

/**
 * Place at: frontend/src/app/admin/orders/page.js
 * Admin orders: see every order, move it pending → processing → shipped → delivered, or cancel it.
 * The list is paged and searchable (order number, customer name / email / phone, tracking number); the status
 * tabs and their counts come from the server, so they cover ALL orders and not just the page on screen.
 *   GET   /api/orders/admin/all?status=&search=&page=&limit=
 *   PATCH /api/orders/:id/status     (also carries the optional courier + tracking number when shipping)
 *   PATCH /api/orders/:id/tracking   (add / fix / remove them later)
 * Each order also links to its printable invoice and packing slip (/admin/orders/:id/invoice, .../packing-slip).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { AdminPager, AdminSearchBox } from '@/components/AdminListTools';
import { API_URL } from '@/lib/imageUrl';
import { orderRef } from '@/lib/orderRef';
import { needsPayment, paymentSummary } from '@/lib/payment';

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAGE_SIZE = 20;

// What the main button does for each status
const NEXT = {
  pending: { status: 'processing', label: 'Mark processing' },
  processing: { status: 'shipped', label: 'Mark shipped' },
  shipped: { status: 'delivered', label: 'Mark delivered' },
};
const CANCELLABLE = ['pending', 'processing'];
const TRACKABLE = ['shipped', 'delivered']; // statuses where the tracking line + Edit button show (shipping itself opens the form)

const trackingText = (o) => [o.courier, o.trackingNumber].filter(Boolean).join(' · ');

export default function AdminOrdersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  // What the list is showing: the status tab, the search text and the page number live together so one change
  // (say a new search, which goes back to page 1) causes exactly one request.
  const [query, setQuery] = useState({ filter: 'all', search: '', page: 1 });
  const [info, setInfo] = useState({ total: 0, pages: 1 });
  const [counts, setCounts] = useState(null); // orders per status among those matching the search
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  // The open tracking form: { id, mode: 'ship' | 'edit', courier, trackingNumber } (one at a time)
  const [track, setTrack] = useState(null);
  const latest = useRef(0); // only the newest request may update the screen (typing fast fires several)

  const { filter, search, page } = query;

  // silent: refresh without blanking the list (used after a status change, so the tab counts stay right)
  const load = useCallback(
    async ({ silent = false } = {}) => {
      const mine = ++latest.current;
      if (!silent) setState('loading');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (filter !== 'all') params.set('status', filter);
        if (search) params.set('search', search);
        const res = await fetch(`${API_URL}/api/orders/admin/all?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (mine !== latest.current) return;
        // The last order on the last page was just moved elsewhere: step back to a page that exists
        if ((data.orders || []).length === 0 && page > 1 && data.pages < page) {
          setQuery((q) => ({ ...q, page: data.pages }));
          return;
        }
        setOrders(data.orders || []);
        setInfo({ total: data.total || 0, pages: data.pages || 1 });
        setCounts(data.counts || null);
        setState('ready');
      } catch {
        if (mine === latest.current) setState('error');
      }
    },
    [filter, search, page]
  );

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  const setFilter = (f) => setQuery((q) => ({ ...q, filter: f, page: 1 }));
  const setSearch = useCallback((text) => setQuery((q) => ({ ...q, search: text, page: 1 })), []);
  const goPage = (p) => {
    setQuery((q) => ({ ...q, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const setStatus = async (order, status, extra = {}) => {
    if (status === 'cancelled' && !window.confirm(`Cancel order #${orderRef(order)}? The stock will go back on sale.`)) return;
    setBusyId(order._id);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order._id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.message || 'Could not update the order');
        load(); // someone else (or the customer) may have changed it: show the truth
        return;
      }
      setOrders((list) =>
        list.map((o) =>
          o._id === order._id ? { ...o, status: data.order.status, trackingNumber: data.order.trackingNumber, courier: data.order.courier } : o
        )
      );
      setTrack(null);
      setToast(`Order marked ${status}`);
      load({ silent: true }); // the order may now belong to another tab, and the tab counts changed
    } catch {
      setToast('Could not reach the server');
    } finally {
      setBusyId(null);
    }
  };

  // Opens the tracking form: "ship" asks for the details before marking shipped, "edit" changes them afterwards
  const openTrack = (order, mode) =>
    setTrack({ id: order._id, mode, courier: order.courier || '', trackingNumber: order.trackingNumber || '' });

  const submitTrack = async (order) => {
    if (!track) return;
    const details = { courier: track.courier.trim(), trackingNumber: track.trackingNumber.trim() };
    if (track.mode === 'ship') {
      await setStatus(order, 'shipped', details); // empty fields are fine: tracking is optional
      return;
    }
    setBusyId(order._id);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order._id}/tracking`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details), // "" clears a field
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.message || 'Could not save tracking details');
        return;
      }
      setOrders((list) =>
        list.map((o) => (o._id === order._id ? { ...o, trackingNumber: data.order.trackingNumber, courier: data.order.courier } : o))
      );
      setTrack(null);
      setToast('Tracking details saved');
    } catch {
      setToast('Could not reach the server');
    } finally {
      setBusyId(null);
    }
  };

  const countOf = (f) => (counts ? ` (${(counts[f] ?? 0).toLocaleString()})` : '');

  return (
    <AdminShell title="Orders">
      <div className="adm__toolbar">
        <AdminSearchBox
          onSearch={setSearch}
          label="Search orders"
          placeholder="Search order number, name, email, phone or tracking"
        />
      </div>

      <div className="adm__tabs" role="tablist">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
            {f}
            {countOf(f)}
          </button>
        ))}
      </div>

      {state === 'loading' && orders.length === 0 && <p className="adm__note">Loading orders…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load orders. <button type="button" onClick={() => load()}>Retry</button>
        </p>
      )}
      {state === 'ready' && orders.length === 0 && (
        <p className="adm__note">
          {search ? `No ${filter === 'all' ? '' : `${filter} `}orders match “${search}”.` : `No ${filter === 'all' ? '' : `${filter} `}orders.`}
        </p>
      )}

      {state !== 'error' && orders.length > 0 && (
        <ul className={`adm__list${state === 'loading' ? ' is-busy' : ''}`} aria-busy={state === 'loading'}>
          {orders.map((o) => {
            const a = o.shippingAddress || {};
            const email = a.email || o.user?.email;
            const next = NEXT[o.status];
            const busy = busyId === o._id;
            return (
              <li key={o._id} className="adm__card">
                <div className="adm__cardtop">
                  <div>
                    <strong>Order #{orderRef(o)}</strong>
                    <span className="adm__meta">
                      {new Date(o.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`adm__badge adm__badge--${o.status}`}>{o.status}</span>
                </div>

                <p className="adm__meta" style={{ margin: '10px 0 0' }}>
                  {a.fullName} · {a.phone}
                  {email ? ` · ${email}` : ''}
                  <br />
                  {[a.line1, a.line2, a.city, a.postalCode, a.country].filter(Boolean).join(', ')}
                  {o.notes ? (
                    <>
                      <br />
                      Note: {o.notes}
                    </>
                  ) : null}
                </p>

                <ul className="adm__items">
                  {o.items.map((it, i) => (
                    <li key={i}>
                      <span>
                        {it.name}{it.size || it.color ? ` (${[it.size, it.color].filter(Boolean).join(' / ')})` : ''} × {it.qty}
                      </span>
                      <span>{money(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                {TRACKABLE.includes(o.status) && (
                  <p className="adm__tracking">
                    <span>Tracking: {trackingText(o) || 'none added'}</span>
                    {!(track && track.id === o._id) && (
                      <button type="button" onClick={() => openTrack(o, 'edit')} disabled={busy}>
                        {trackingText(o) ? 'Edit' : 'Add'}
                      </button>
                    )}
                  </p>
                )}

                {track && track.id === o._id && (
                  <form
                    className="adm__trackform"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitTrack(o);
                    }}
                  >
                    <input
                      type="text"
                      value={track.courier}
                      onChange={(e) => setTrack((t) => ({ ...t, courier: e.target.value }))}
                      placeholder="Courier (e.g. TCS)"
                      maxLength={40}
                      aria-label="Courier"
                    />
                    <input
                      type="text"
                      value={track.trackingNumber}
                      onChange={(e) => setTrack((t) => ({ ...t, trackingNumber: e.target.value }))}
                      placeholder="Tracking number"
                      maxLength={60}
                      aria-label="Tracking number"
                      autoFocus
                    />
                    <button type="submit" className="adm__btn" disabled={busy}>
                      {busy ? 'Saving…' : track.mode === 'ship' ? 'Mark shipped' : 'Save'}
                    </button>
                    <button type="button" className="adm__btn adm__btn--ghost" disabled={busy} onClick={() => setTrack(null)}>
                      Cancel
                    </button>
                  </form>
                )}

                <div className="adm__foot">
                  <strong>
                    {money(o.total)} · {paymentSummary(o).toLowerCase()}
                    {o.discount > 0 && (
                      <small className="adm__meta" style={{ display: 'block', fontWeight: 400 }}>
                        Promo {o.promo?.code || ''} · −{money(o.discount)}
                      </small>
                    )}
                    {needsPayment(o) && (
                      <small className="adm__meta" style={{ display: 'block', fontWeight: 400 }}>
                        Not paid yet: wait for the payment before shipping
                      </small>
                    )}
                  </strong>
                  <span>
                    {o.status !== 'cancelled' && (
                      <>
                        <Link href={`/admin/orders/${o._id}/invoice`} className="adm__btn adm__btn--ghost">
                          Invoice
                        </Link>
                        <Link href={`/admin/orders/${o._id}/packing-slip`} className="adm__btn adm__btn--ghost">
                          Packing slip
                        </Link>
                      </>
                    )}
                    {CANCELLABLE.includes(o.status) && (
                      <button type="button" className="adm__btn adm__btn--danger" disabled={busy} onClick={() => setStatus(o, 'cancelled')}>
                        Cancel order
                      </button>
                    )}
                    {next && (
                      <button
                        type="button"
                        className="adm__btn"
                        disabled={busy}
                        onClick={() => (next.status === 'shipped' ? openTrack(o, 'ship') : setStatus(o, next.status))}
                      >
                        {busy ? 'Saving…' : next.label}
                      </button>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {state !== 'error' && (
        <AdminPager page={page} pages={info.pages} total={info.total} limit={PAGE_SIZE} onPage={goPage} noun="orders" disabled={state === 'loading'} />
      )}

      {toast && <div className="adm__toast">{toast}</div>}
    </AdminShell>
  );
}
