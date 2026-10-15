'use client';

/**
 * Place at: frontend/src/app/admin/returns/page.js
 * Admin returns: review return requests and move them requested -> approved -> received -> refunded
 * (or reject a request with a note the customer will see).
 *   GET   /api/orders/admin/returns
 *   PATCH /api/orders/:id/return
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { API_URL } from '@/lib/imageUrl';
import { orderRef } from '@/lib/orderRef';
import { reasonLabel } from '@/lib/returns';
import './admin-returns.css';

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const FILTERS = ['all', 'requested', 'approved', 'received', 'refunded', 'rejected'];
const fmt = (d) => new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// The main action for each stage (rejecting is a separate button, only while a request is new)
const NEXT = {
  requested: { status: 'approved', label: 'Approve return' },
  approved: { status: 'received', label: 'Mark item received' },
  received: { status: 'refunded', label: 'Mark refunded' },
};

export default function AdminReturnsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [filter, setFilter] = useState('requested');
  const [notes, setNotes] = useState({}); // orderId -> note being typed
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(`${API_URL}/api/orders/admin/returns`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setOrders(data.orders || []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const setStatus = async (order, status) => {
    const typed = (notes[order._id] ?? '').trim();
    if (status === 'rejected' && !typed) {
      setToast('Write a short note first: the customer will see why it was rejected');
      return;
    }
    if (status === 'refunded' && !window.confirm(`Mark order #${orderRef(order)} as refunded? Make sure the customer has been paid back.`)) return;

    setBusyId(order._id);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order._id}/return`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // an empty box leaves the existing note alone
        body: JSON.stringify({ status, ...(typed ? { adminNote: typed } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.message || 'Could not update the return');
        load(); // the request may have changed since this page loaded: show the truth
        return;
      }
      setOrders((list) => list.map((o) => (o._id === order._id ? { ...o, returnRequest: data.order.returnRequest } : o)));
      setNotes((n) => ({ ...n, [order._id]: '' }));
      setToast(`Return marked ${status}`);
    } catch {
      setToast('Could not reach the server');
    } finally {
      setBusyId(null);
    }
  };

  const shown = filter === 'all' ? orders : orders.filter((o) => o.returnRequest?.status === filter);
  const countOf = (f) => (f === 'all' ? orders.length : orders.filter((o) => o.returnRequest?.status === f).length);

  return (
    <AdminShell title="Returns">
      <div className="adm__tabs" role="tablist">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
            {f} ({countOf(f)})
          </button>
        ))}
      </div>

      {state === 'loading' && <p className="adm__note">Loading returns…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load returns. <button type="button" onClick={load}>Retry</button>
        </p>
      )}
      {state === 'ready' && shown.length === 0 && <p className="adm__note">No {filter === 'all' ? '' : filter} returns.</p>}

      {state === 'ready' && shown.length > 0 && (
        <ul className="adm__list">
          {shown.map((o) => {
            const r = o.returnRequest;
            const a = o.shippingAddress || {};
            const email = a.email || o.user?.email;
            const next = NEXT[r.status];
            const busy = busyId === o._id;
            return (
              <li key={o._id} className="adm__card">
                <div className="adm__cardtop">
                  <div>
                    <strong>Order #{orderRef(o)}</strong>
                    <span className="adm__meta">Requested {fmt(r.requestedAt)}</span>
                  </div>
                  <span className={`adm__badge adm__badge--ret-${r.status}`}>{r.status}</span>
                </div>

                <p className="adm__meta" style={{ margin: '10px 0 0' }}>
                  {a.fullName || o.user?.name} · {a.phone}
                  {email ? ` · ${email}` : ''}
                  <br />
                  Order total {money(o.total)}
                  {o.deliveredAt ? ` · delivered ${fmt(o.deliveredAt)}` : ''}
                </p>

                <p className="adm__body">
                  <strong>{reasonLabel(r.reason)}</strong>
                  {r.details ? `\n${r.details}` : ''}
                </p>

                <ul className="adm__items">
                  {r.items.map((it, i) => (
                    <li key={i}>
                      <span>{it.name}</span>
                      <span>× {it.qty}</span>
                    </li>
                  ))}
                </ul>

                {r.resolvedAt && <p className="adm__meta" style={{ margin: '10px 0 0' }}>Closed {fmt(r.resolvedAt)}</p>}

                {next ? (
                  <div className="adm__foot adm__foot--stack">
                    <textarea
                      className="adm__note-input"
                      rows={2}
                      maxLength={500}
                      aria-label="Note for the customer"
                      placeholder={
                        r.adminNote
                          ? `Current note: ${r.adminNote} (type to replace it)`
                          : 'Note for the customer (required to reject, optional otherwise)'
                      }
                      value={notes[o._id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [o._id]: e.target.value }))}
                      disabled={busy}
                    />
                    <span>
                      {r.status === 'requested' && (
                        <button type="button" className="adm__btn adm__btn--danger" disabled={busy} onClick={() => setStatus(o, 'rejected')}>
                          Reject
                        </button>
                      )}
                      <button type="button" className="adm__btn" disabled={busy} onClick={() => setStatus(o, next.status)}>
                        {busy ? 'Saving…' : next.label}
                      </button>
                    </span>
                  </div>
                ) : (
                  r.adminNote && (
                    <p className="adm__meta" style={{ margin: '10px 0 0' }}>
                      Note shown to customer: {r.adminNote}
                    </p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {toast && <div className="adm__toast">{toast}</div>}

    </AdminShell>
  );
}
