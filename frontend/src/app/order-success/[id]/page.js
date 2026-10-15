'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · ORDER SUCCESS (THANK-YOU) PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/order-success/[id]/page.js
 *
 *  Checkout sends the customer here right after the backend saves the order.
 *  The page loads the order itself (GET /api/orders/:id, cookie-authenticated, only the
 *  owner can read it), so it still works after a refresh or when the link is reopened,
 *  and it always shows what the server actually saved: order number, items and totals.
 *
 *  Online orders (PayFast, JazzCash, Easypaisa): the gateway sends the customer back here, but only the backend marks an
 *  order paid (after verifying the gateway's message). So an unpaid online order shows "Confirming your payment…" and re-reads the order every few seconds for about a
 *  minute. If it is still unpaid then (or the customer came back from a failed / cancelled payment, or the webhook
 *  said it failed), the page says so and offers "Pay now", which asks the backend for a fresh payment form.
 */

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { orderRef } from '@/lib/orderRef';
import { trackPurchase } from '@/lib/analytics';
import { PAYMENT_POLL_MAX, PAYMENT_POLL_MS, gatewayName, isOnlinePayment, needsPayment, paidVia, requestPayment, submitPayment } from '@/lib/payment';
import './order-success.css';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--aur-serif',
  display: 'swap',
});
const sans = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--aur-sans',
  display: 'swap',
});

const formatPKR = (n) => {
  const value = Number(n);
  return Number.isFinite(value) ? `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}` : 'Rs —';
};

const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export default function OrderSuccessPage({ params }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { count } = useCart();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | signin | notfound | error
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [polls, setPolls] = useState(0); // how many times we have re-read an unpaid card order
  const [cameBackFailed, setCameBackFailed] = useState(false); // PayFast sent the customer back with ?payment=failed
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    try {
      // startsWith: a gateway may add its own parameters after ours with a second "?", which ends up inside this value
      setCameBackFailed((new URLSearchParams(window.location.search).get('payment') || '').startsWith('failed'));
    } catch {
      /* no address to read: treat as a normal visit */
    }
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setState('signin');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}`, { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) throw new Error('notfound');
        if (res.status === 401) throw new Error('signin');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        setOrder(data.order);
        setState('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState(['notfound', 'signin'].includes(err.message) ? err.message : 'error');
      });
    return () => controller.abort();
  }, [id, user, authLoading, attempt]);

  // A card order that is not paid yet: wait for the webhook (unless we already know the payment failed)
  const waiting =
    state === 'ready' && Boolean(order) && needsPayment(order) && order.paymentStatus !== 'failed' && !cameBackFailed && polls < PAYMENT_POLL_MAX;

  useEffect(() => {
    if (!waiting) return undefined;
    let stopped = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!stopped && data.order) setOrder(data.order);
        }
      } catch {
        /* network blip: the next round tries again */
      }
      if (!stopped) setPolls((n) => n + 1);
    }, PAYMENT_POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [waiting, polls, id]);

  // Analytics: count the order once (only if analytics is on and the visitor accepted; otherwise this does nothing).
  // A card order only counts once it is paid.
  useEffect(() => {
    if (state === 'ready' && order && !needsPayment(order)) trackPurchase(order, orderRef(order));
  }, [state, order]);

  const payNow = async () => {
    if (payBusy) return;
    setPayBusy(true);
    setPayError('');
    const r = await requestPayment(API_URL, id);
    if (!r.ok || !submitPayment(r.payment)) {
      setPayError(r.message || 'We could not open the payment page. Please try again.');
      setPayBusy(false);
    }
    // on success the browser is leaving for the gateway: keep the button disabled
  };

  const checkAgain = () => {
    setCameBackFailed(false);
    setPolls(0);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(orderRef(order));
      setCopied(true);
    } catch {
      /* clipboard blocked: the number is on screen anyway */
    }
  };

  const a = order?.shippingAddress || {};
  const subtotal = order ? order.items.reduce((n, it) => n + it.price * it.qty, 0) : 0;
  const discount = order?.discount > 0 ? order.discount : 0; // promo code, if one was used
  const shipping = order ? Math.max(0, Math.round((order.total - subtotal + discount) * 100) / 100) : 0;
  const email = a.email || user?.email;
  const firstName = (a.fullName || user?.name || '').trim().split(/\s+/)[0];
  const online = isOnlinePayment(order);
  const unpaid = Boolean(order) && needsPayment(order); // online order still waiting for (or failed) payment
  const failed = unpaid && (order.paymentStatus === 'failed' || cameBackFailed);

  return (
    <>
      <Navbar cartCount={count} />

      <main className={`${serif.variable} ${sans.variable} aur-ok`}>
        {(state === 'loading' || authLoading) && <p className="aur-ok__note">Loading your order…</p>}

        {state === 'signin' && !authLoading && (
          <div className="aur-ok__state">
            <h1>Sign in to see this order</h1>
            <p>Your order confirmation is tied to your account. If you ordered as a guest, you can look it up with your order number and email.</p>
            <Link href="/login" className="aur-ok__btn">Sign in</Link>
            <Link href="/track-order" className="aur-ok__link">Track an order</Link>
          </div>
        )}

        {state === 'notfound' && (
          <div className="aur-ok__state">
            <h1>We couldn&apos;t find that order</h1>
            <p>The link may be out of date. Your orders are listed in your account.</p>
            <Link href="/account/orders" className="aur-ok__btn">View my orders</Link>
          </div>
        )}

        {state === 'error' && (
          <div className="aur-ok__state">
            <h1>Something went wrong</h1>
            <p>Your order was placed, we just couldn&apos;t load the details. Try again, or check your orders.</p>
            <button type="button" className="aur-ok__btn" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
            <Link href="/account/orders" className="aur-ok__link">View my orders</Link>
          </div>
        )}

        {state === 'ready' && order && (
          <div className="aur-ok__wrap">
            <header className="aur-ok__head">
              {unpaid ? (
                <span className={`aur-ok__icon aur-ok__icon--${waiting ? 'wait' : 'warn'}`} aria-hidden="true">{waiting ? '…' : '!'}</span>
              ) : (
                <span className="aur-ok__icon"><CheckIcon /></span>
              )}
              {waiting ? (
                <>
                  <h1>Confirming your payment…</h1>
                  <p role="status">This usually takes a few seconds. Please keep this page open.</p>
                </>
              ) : failed ? (
                <>
                  <h1>Your payment didn&apos;t go through</h1>
                  <p>Your order is saved and your items are held for a short time. You can try paying again below.</p>
                </>
              ) : unpaid ? (
                <>
                  <h1>We haven&apos;t received your payment yet</h1>
                  <p>If money has left your account, this page will update as soon as {gatewayName(order)} confirms it. Otherwise you can pay again below.</p>
                </>
              ) : (
                <>
                  <h1>{firstName ? `Thank you, ${firstName}.` : 'Thank you.'}</h1>
                  <p>
                    {online ? 'Payment received. ' : ''}Your order is placed{email ? <>. We&apos;ll send updates to <strong>{email}</strong></> : null}.
                  </p>
                </>
              )}
            </header>

            {unpaid && !waiting && (
              <section className="aur-ok__card aur-ok__payBox">
                <button type="button" className="aur-ok__btn" onClick={payNow} disabled={payBusy}>
                  {payBusy ? `Opening ${gatewayName(order)}…` : `Pay ${formatPKR(order.total)} now`}
                </button>
                <button type="button" className="aur-ok__link aur-ok__linkBtn" onClick={checkAgain}>
                  I already paid, check again
                </button>
                {payError && <p className="aur-ok__payError" role="alert">{payError}</p>}
              </section>
            )}

            <section className="aur-ok__number" aria-label="Order number">
              <span>Order number</span>
              <strong>{orderRef(order)}</strong>
              <button type="button" onClick={copyNumber}>{copied ? 'Copied' : 'Copy'}</button>
              <small>Keep it handy — you&apos;ll need it with your email to track the order.</small>
            </section>

            <section className="aur-ok__card">
              <ul className="aur-ok__items">
                {order.items.map((it, i) => (
                  <li key={i}>
                    <span className="aur-ok__thumb" style={{ backgroundImage: it.image ? `url(${imageSrc(it.image)})` : undefined }} />
                    <span className="aur-ok__info">
                      <strong>{it.name}</strong>
                      <small>{[it.size, it.color].filter(Boolean).join(' / ')}{it.size || it.color ? ' · ' : ''}Qty {it.qty}</small>
                    </span>
                    <span>{formatPKR(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="aur-ok__totals">
                <div><span>Subtotal</span><span>{formatPKR(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="is-discount"><span>Discount{order.promo?.code ? ` (${order.promo.code})` : ''}</span><span>−{formatPKR(discount)}</span></div>
                )}
                <div><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPKR(shipping)}</span></div>
                <div className="is-total"><span>Total</span><span>{formatPKR(order.total)}</span></div>
              </div>
              <p className="aur-ok__pay">
                {!online
                  ? 'You\u2019ll pay cash on delivery.'
                  : order.paymentStatus === 'paid'
                    ? `Paid ${paidVia(order)}.`
                    : order.paymentStatus === 'refunded'
                      ? `Paid ${paidVia(order)} and refunded.`
                      : `${order.paymentMethod === 'card' ? 'Card payment through PayFast' : `${gatewayName(order)} payment`}: not confirmed yet.`}
              </p>
            </section>

            <section className="aur-ok__card aur-ok__ship">
              <h2>Delivering to</h2>
              <p>
                {a.fullName}
                <br />
                {[a.line1, a.line2, a.city, a.postalCode, a.country].filter(Boolean).join(', ')}
                {a.phone ? (
                  <>
                    <br />
                    {a.phone}
                  </>
                ) : null}
              </p>
              <p className="aur-ok__next">{unpaid ? 'We will pack and ship your order once the payment is confirmed. ' : ''}When your order ships, its tracking number will appear in your orders and in our email.</p>
            </section>

            <div className="aur-ok__actions">
              <Link href="/shop" className="aur-ok__btn">Continue shopping</Link>
              <Link href="/account/orders" className="aur-ok__link">View my orders</Link>
              <Link href="/track-order" className="aur-ok__link">Track an order</Link>
            </div>
          </div>
        )}
      </main>

      <Footer />

    </>
  );
}
