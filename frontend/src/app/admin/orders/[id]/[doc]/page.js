'use client';

/**
 * Place at: frontend/src/app/admin/orders/[id]/[doc]/page.js
 *
 * Printable documents for one order (admin only):
 *   /admin/orders/<order id>/invoice        customer invoice, with prices
 *   /admin/orders/<order id>/packing-slip   what to put in the parcel, no prices
 *
 * Loads GET /api/orders/admin/:id. The "Print / Save as PDF" button opens the browser's print dialog;
 * the toolbar and page background are hidden when printing, so only the sheet comes out on paper.
 * The store's name, address and contact details come from src/lib/store.js (the same place as the footer).
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import { usePolicy } from '@/context/PolicyContext';
import { API_URL } from '@/lib/imageUrl';
import { orderRef } from '@/lib/orderRef';
import { isOnlinePayment, methodLabel, PAYMENT_STATUS_LABEL } from '@/lib/payment';
import { STORE } from '@/lib/store';
import './admin-order-document.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

const DOCS = { invoice: 'Invoice', 'packing-slip': 'Packing slip' };

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const dateText = (d) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
const variantText = (it) => [it.size, it.color].filter(Boolean).join(' / ');

export default function OrderDocumentPage({ params }) {
  const { id, doc } = use(params);
  if (!DOCS[doc]) notFound();

  const { isAdmin, loading: authLoading } = useAuth();
  const { returnWindowDays } = usePolicy();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | notfound | error

  useEffect(() => {
    if (authLoading || !isAdmin) return undefined;
    const controller = new AbortController();
    setState('loading');
    fetch(`${API_URL}/api/orders/admin/${encodeURIComponent(id)}`, { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) throw new Error('notfound');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        setOrder(data.order);
        setState('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState(err.message === 'notfound' ? 'notfound' : 'error');
      });
    return () => controller.abort();
  }, [authLoading, isAdmin, id]);

  // The browser uses the page title as the default file name when saving as PDF
  useEffect(() => {
    if (order) document.title = `${DOCS[doc]} ${orderRef(order)}`;
  }, [order, doc]);

  const isInvoice = doc === 'invoice';
  const other = isInvoice ? 'packing-slip' : 'invoice';

  const a = order?.shippingAddress || {};
  const email = a.email || order?.user?.email;
  const items = order?.items || [];
  const subtotal = items.reduce((n, it) => n + it.price * it.qty, 0);
  const discount = order?.discount > 0 ? order.discount : 0; // promo code, if one was used
  const shipping = order ? Math.max(0, Math.round((order.total - subtotal + discount) * 100) / 100) : 0;
  const units = items.reduce((n, it) => n + it.qty, 0);
  const tracking = order ? [order.courier, order.trackingNumber].filter(Boolean).join(' · ') : '';

  return (
    <main className={`${serif.variable} ${sans.variable} doc-page`}>
      <div className="doc-bar">
        <Link href="/admin/orders">← Back to orders</Link>
        <div className="doc-bar__right">
          <Link href={`/admin/orders/${id}/${other}`} className="doc-bar__switch">
            Open {DOCS[other].toLowerCase()}
          </Link>
          <button type="button" onClick={() => window.print()} disabled={state !== 'ready'}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {authLoading && <p className="doc-note">Checking access…</p>}
      {!authLoading && !isAdmin && (
        <p className="doc-note">
          Admin access required. <Link href="/admin/login">Admin sign in</Link>
        </p>
      )}
      {isAdmin && state === 'loading' && <p className="doc-note">Loading order…</p>}
      {isAdmin && state === 'notfound' && <p className="doc-note">We couldn&apos;t find that order.</p>}
      {isAdmin && state === 'error' && <p className="doc-note doc-note--error">Couldn&apos;t load the order. Please refresh the page.</p>}

      {isAdmin && state === 'ready' && order && (
        <article className="doc-sheet">
          <header className="doc-head">
            <div>
              <p className="doc-brand">{STORE.name}</p>
              <p className="doc-small">
                {STORE.address.filter(Boolean).join(', ')}
                <br />
                {STORE.email} · {STORE.phone}
              </p>
            </div>
            <div className="doc-title">
              <h1>{DOCS[doc]}</h1>
              <dl>
                <dt>{isInvoice ? 'Invoice no.' : 'Order no.'}</dt>
                <dd>{orderRef(order)}</dd>
                <dt>Order date</dt>
                <dd>{dateText(order.createdAt)}</dd>
                {isInvoice && (
                  <>
                    <dt>Status</dt>
                    <dd className="doc-cap">{order.status}</dd>
                  </>
                )}
              </dl>
            </div>
          </header>

          <section className="doc-parties">
            <div>
              <h2>{isInvoice ? 'Billed & shipped to' : 'Ship to'}</h2>
              <p className="doc-strong">{a.fullName}</p>
              <p>
                {[a.line1, a.line2].filter(Boolean).join(', ')}
                <br />
                {[a.city, a.postalCode].filter(Boolean).join(' ')}
                {a.country ? `, ${a.country}` : ''}
              </p>
              <p>
                {a.phone}
                {email ? (
                  <>
                    <br />
                    {email}
                  </>
                ) : null}
              </p>
            </div>
            <div>
              <h2>{isInvoice ? 'Payment' : 'Shipping'}</h2>
              {isInvoice ? (
                <>
                  <p className="doc-strong">{methodLabel(order)}</p>
                  <p>
                    {isOnlinePayment(order)
                      ? order.status === 'cancelled' && order.paymentStatus !== 'paid'
                        ? 'Order cancelled. Nothing is due.'
                        : PAYMENT_STATUS_LABEL[order.paymentStatus || 'unpaid'] || order.paymentStatus
                      : order.status === 'delivered'
                        ? 'Paid in cash on delivery.'
                        : order.status === 'cancelled'
                          ? 'Order cancelled. Nothing is due.'
                          : `Amount due on delivery: ${money(order.total)}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="doc-strong">{units} {units === 1 ? 'item' : 'items'} to pack</p>
                  <p>{tracking ? `Courier / tracking: ${tracking}` : 'Courier / tracking: not added yet'}</p>
                  {order.paymentMethod === 'cod' && <p className="doc-cod">Cash on delivery: collect {money(order.total)}</p>}
                </>
              )}
            </div>
          </section>

          {!isInvoice && order.notes && (
            <p className="doc-notes">
              <strong>Customer note:</strong> {order.notes}
            </p>
          )}

          <table className="doc-table">
            <thead>
              <tr>
                {!isInvoice && <th className="doc-check" aria-label="Packed" />}
                <th>Item</th>
                {isInvoice && <th className="doc-num">Price</th>}
                <th className="doc-num">Qty</th>
                {isInvoice && <th className="doc-num">Total</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  {!isInvoice && (
                    <td className="doc-check">
                      <span className="doc-box" />
                    </td>
                  )}
                  <td>
                    <span className="doc-strong">{it.name}</span>
                    {variantText(it) && <span className="doc-variant">{variantText(it)}</span>}
                  </td>
                  {isInvoice && <td className="doc-num">{money(it.price)}</td>}
                  <td className="doc-num">{it.qty}</td>
                  {isInvoice && <td className="doc-num">{money(it.price * it.qty)}</td>}
                </tr>
              ))}
            </tbody>
          </table>

          {isInvoice ? (
            <div className="doc-totals">
              <div>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div>
                  <span>Discount{order.promo?.code ? ` (${order.promo.code})` : ''}</span>
                  <span>−{money(discount)}</span>
                </div>
              )}
              <div>
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : money(shipping)}</span>
              </div>
              <div className="doc-totals__grand">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
          ) : (
            <div className="doc-sign">
              <span>Packed by</span>
              <span>Checked by</span>
            </div>
          )}

          <footer className="doc-foot">
            {isInvoice ? (
              <>
                <p>Thank you for shopping with {STORE.name}.</p>
                <p>Returns are accepted within {returnWindowDays} days of delivery. Questions? {STORE.supportEmail}</p>
              </>
            ) : (
              <p>Please check every item against this list before sealing the parcel. Questions? {STORE.supportEmail}</p>
            )}
          </footer>
        </article>
      )}

    </main>
  );
}
