'use client';

/**
 * Place at: frontend/src/app/account/orders/page.js
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { orderRef } from '@/lib/orderRef';
import { gatewayName, isOnlinePayment, needsPayment, paymentSummary, paymentTone, requestPayment, submitPayment } from '@/lib/payment';
import { RETURN_REASONS, RETURN_STATUS_LABEL, reasonLabel } from '@/lib/returns';
import './account-orders.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const STATUS_LABEL = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// An order can be cancelled until it ships (the backend enforces the same rule)
const CANCELLABLE = ['pending', 'processing'];

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState({}); // orderId -> message
  const [payingId, setPayingId] = useState(null); // online order being sent to its payment gateway
  const [payError, setPayError] = useState({}); // orderId -> message

  // Pay (or pay again) for an online order that is not paid yet
  const payOrder = async (order) => {
    if (payingId) return;
    setPayingId(order._id);
    setPayError((m) => ({ ...m, [order._id]: '' }));
    const r = await requestPayment(API_URL, order._id);
    if (!r.ok || !submitPayment(r.payment)) {
      setPayError((m) => ({ ...m, [order._id]: r.message || 'We could not open the payment page. Please try again.' }));
      setPayingId(null);
    }
    // on success the browser is leaving for the gateway
  };

  // ---- return requests (delivered orders only) ----
  const [returnFor, setReturnFor] = useState(null); // id of the order whose return form is open
  const [returnForm, setReturnForm] = useState({ reason: '', details: '', picked: [] });
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnError, setReturnError] = useState({}); // orderId -> message

  const openReturn = (order) => {
    setReturnFor(order._id);
    setReturnForm({ reason: '', details: '', picked: order.items.map((_, i) => i) }); // everything ticked to start
    setReturnError((m) => ({ ...m, [order._id]: '' }));
  };

  const togglePicked = (i) =>
    setReturnForm((f) => ({ ...f, picked: f.picked.includes(i) ? f.picked.filter((x) => x !== i) : [...f.picked, i] }));

  const submitReturn = async (order) => {
    const fail = (message) => setReturnError((m) => ({ ...m, [order._id]: message }));
    if (!returnForm.reason) return fail('Please choose a reason.');
    if (returnForm.picked.length === 0) return fail('Select at least one item to return.');
    if (returnForm.reason === 'other' && !returnForm.details.trim()) return fail('Please tell us a little more about the reason.');

    setReturnBusy(true);
    fail('');
    try {
      const res = await fetch(`${API_URL}/api/orders/${order._id}/return`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: returnForm.reason, details: returnForm.details, items: returnForm.picked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // e.g. the window just closed: show why, and refresh the list so the page tells the truth
        fail(data.message || 'Could not send the return request.');
        const again = await fetch(`${API_URL}/api/orders`, { credentials: 'include' }).then((r) => r.json()).catch(() => null);
        if (again?.orders) setOrders(again.orders);
        return;
      }
      setOrders((list) =>
        list.map((o) => (o._id === order._id ? { ...o, returnRequest: data.order.returnRequest, returnableUntil: undefined } : o))
      );
      setReturnFor(null);
    } catch {
      fail('Could not reach the server. Please try again.');
    } finally {
      setReturnBusy(false);
    }
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancel order #${orderRef(order)}? This can't be undone.`)) return;
    setCancellingId(order._id);
    setCancelError((m) => ({ ...m, [order._id]: '' }));
    try {
      const res = await fetch(`${API_URL}/api/orders/${order._id}/cancel`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // e.g. an admin shipped it a moment ago: show why, and refresh the list so the status is right
        setCancelError((m) => ({ ...m, [order._id]: data.message || 'Could not cancel this order.' }));
        const again = await fetch(`${API_URL}/api/orders`, { credentials: 'include' }).then((r) => r.json()).catch(() => null);
        if (again?.orders) setOrders(again.orders);
        return;
      }
      setOrders((list) => list.map((o) => (o._id === order._id ? { ...o, status: 'cancelled' } : o)));
    } catch {
      setCancelError((m) => ({ ...m, [order._id]: 'Could not reach the server. Please try again.' }));
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load orders');
        setOrders(data.orders || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
      <main className={`${serif.variable} ${sans.variable} acc-orders`}>
        <div className="acc-orders__head">
          <p className="acc-orders__eyebrow">Account</p>
          <h1>Your orders</h1>
        </div>

        {!authLoading && !user && (
          <div className="acc-orders__empty">
            <p>You need to sign in to see your orders.</p>
            <Link href="/login" className="acc-orders__cta">Sign in</Link>
          </div>
        )}

        {user && loading && <p className="acc-orders__status">Loading your orders…</p>}
        {user && error && <p className="acc-orders__status acc-orders__status--error">{error}</p>}

        {user && !loading && !error && orders.length === 0 && (
          <div className="acc-orders__empty">
            <p>You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="acc-orders__cta">Start shopping</Link>
          </div>
        )}

        {user && !loading && orders.length > 0 && (
          <ul className="acc-orders__list">
            {orders.map((order) => (
              <li key={order._id} className="acc-orders__card">
                <div className="acc-orders__top">
                  <div>
                    <strong>Order #{orderRef(order)}</strong>
                    <span>{new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span className={`acc-orders__badge acc-orders__badge--${order.status}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                <ul className="acc-orders__items">
                  {order.items.map((it, i) => (
                    <li key={i}>
                      <span className="acc-orders__thumb" style={{ backgroundImage: it.image ? `url(${imageSrc(it.image)})` : undefined }} />
                      <span className="acc-orders__itemInfo">
                        <strong>{it.name}</strong>
                        <small>{[it.size, it.color].filter(Boolean).join(' / ')}{it.size || it.color ? ' · ' : ''}Qty {it.qty}</small>
                      </span>
                      <span>{money(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                {order.trackingNumber && order.status !== 'cancelled' && (
                  <p className="acc-orders__tracking">
                    Tracking number: <strong>{order.trackingNumber}</strong>
                    {order.courier ? <> · {order.courier}</> : null}
                  </p>
                )}

                <div className="acc-orders__foot">
                  <span>Total</span>
                  <strong>{money(order.total)}</strong>
                </div>
                <p className="acc-orders__pay">
                  <span>Payment</span>
                  <span className={`acc-orders__payBadge acc-orders__payBadge--${isOnlinePayment(order) ? paymentTone(order) : 'cod'}`}>
                    {paymentSummary(order)}
                  </span>
                </p>
                {needsPayment(order) && (
                  <div className="acc-orders__cancel">
                    <button type="button" className="acc-orders__payBtn" onClick={() => payOrder(order)} disabled={payingId === order._id}>
                      {payingId === order._id ? `Opening ${gatewayName(order)}…` : `Pay ${money(order.total)} now`}
                    </button>
                  </div>
                )}
                {payError[order._id] && <p className="acc-orders__cancel-error">{payError[order._id]}</p>}

                {CANCELLABLE.includes(order.status) && (
                  <div className="acc-orders__cancel">
                    <button type="button" onClick={() => cancelOrder(order)} disabled={cancellingId === order._id}>
                      {cancellingId === order._id ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  </div>
                )}
                {cancelError[order._id] && <p className="acc-orders__cancel-error">{cancelError[order._id]}</p>}

                {/* A return that was already requested: show where it stands */}
                {order.status === 'delivered' && order.returnRequest && (
                  <div className="acc-orders__return">
                    <p className="acc-orders__returnHead">
                      <strong>Return</strong>
                      <span className={`acc-orders__returnBadge acc-orders__returnBadge--${order.returnRequest.status}`}>
                        {RETURN_STATUS_LABEL[order.returnRequest.status] || order.returnRequest.status}
                      </span>
                    </p>
                    <p className="acc-orders__returnMeta">
                      {reasonLabel(order.returnRequest.reason)} · {order.returnRequest.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
                    </p>
                    {order.returnRequest.adminNote && <p className="acc-orders__returnNote">{order.returnRequest.adminNote}</p>}
                  </div>
                )}

                {/* No request yet and still inside the return window: offer the form */}
                {order.status === 'delivered' && !order.returnRequest && order.returnableUntil && new Date(order.returnableUntil) > new Date() && (
                  returnFor === order._id ? (
                    <form
                      className="acc-orders__returnForm"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitReturn(order);
                      }}
                    >
                      <fieldset>
                        <legend>Which items are you returning?</legend>
                        {order.items.map((it, i) => (
                          <label key={i} className="acc-orders__check">
                            <input type="checkbox" checked={returnForm.picked.includes(i)} onChange={() => togglePicked(i)} />
                            <span>
                              {it.name}{it.size || it.color ? ` (${[it.size, it.color].filter(Boolean).join(' / ')})` : ''} × {it.qty}
                            </span>
                          </label>
                        ))}
                      </fieldset>

                      <label className="acc-orders__field">
                        Reason
                        <select value={returnForm.reason} onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))} required>
                          <option value="">Choose a reason</option>
                          {RETURN_REASONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="acc-orders__field">
                        Details {returnForm.reason === 'other' ? '' : '(optional)'}
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={returnForm.details}
                          onChange={(e) => setReturnForm((f) => ({ ...f, details: e.target.value }))}
                          required={returnForm.reason === 'other'}
                        />
                      </label>

                      <div className="acc-orders__returnActions">
                        <button type="button" className="is-ghost" onClick={() => setReturnFor(null)} disabled={returnBusy}>
                          Close
                        </button>
                        <button type="submit" disabled={returnBusy}>
                          {returnBusy ? 'Sending…' : 'Send return request'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="acc-orders__returnOffer">
                      <small>
                        You can request a return until{' '}
                        {new Date(order.returnableUntil).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}.
                      </small>
                      <button type="button" onClick={() => openReturn(order)}>
                        Request return
                      </button>
                    </div>
                  )
                )}
                {returnError[order._id] && <p className="acc-orders__cancel-error">{returnError[order._id]}</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />

    </>
  );
}