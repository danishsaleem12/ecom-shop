'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · CHECKOUT PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/checkout/page.js
 *
 *  Placing an order calls POST /api/orders (cookie-authenticated), so the
 *  customer must be signed in. The cart is only cleared after the backend
 *  confirms the order was saved, then the customer is sent to the thank-you page
 *  (/order-success/<order id>), which shows the order number. The order also shows up
 *  under /account/orders and can be looked up on /track-order with that number.
 *
 *  The client sends only product ids + quantities (and the total it showed the
 *  customer). The backend prices the order from the database and takes the stock.
 *  If prices or stock changed, it replies 409 with the current values, and the bag
 *  is refreshed here via syncItems() so the customer can review and try again.
 *
 *  Promo code (POST /api/promos/validate): the customer types a code in the order summary and sees the discount
 *  straight away. That answer is only a preview: the order request sends the code along with the total, and the
 *  backend checks it again (it may have expired or run out) and prices the order itself. A code the backend
 *  refuses is removed here with its message.
 *
 *  Saved addresses (GET /api/addresses): a signed-in customer can pick one of theirs to fill the form,
 *  the default one is filled in automatically, and a new address can be saved right after the order is placed.
 *
 *  Online payment (PayFast, JazzCash, Easypaisa): choosing one sends paymentMethod "card", "jazzcash" or "easypaisa".
 *  The backend saves the order as unpaid and answers { order, payment }; the browser then posts payment.fields to the
 *  gateway (see src/lib/payment.js) and the customer pays on the gateway's page. They come back to /order-success/<id>, which shows the real payment status.
 *  Each online method is only selectable when GET /api/payments/methods says its keys are set; otherwise it is shown
 *  disabled with a "Coming soon" badge (demo mode: only cash on delivery works).
 *  If the backend sends no usable payment form, the customer still lands on the order page, which has a "Pay now"
 *  button, so an order is never lost.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VerifyEmailNotice from '@/components/VerifyEmailNotice';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { usePolicy } from '@/context/PolicyContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { ONLINE_METHODS, gatewayName, submitPayment, validPayment } from '@/lib/payment';

// The online ways to pay, in the order they are listed at checkout
const ONLINE_OPTIONS = [
  { value: 'card', title: 'Card or mobile wallet', note: 'Pay securely online with PayFast. You will be taken to their page to pay.' },
  { value: 'jazzcash', title: 'JazzCash', note: 'Pay from your JazzCash mobile account. You will be taken to JazzCash to approve the payment.' },
  { value: 'easypaisa', title: 'Easypaisa', note: 'Pay from your Easypaisa mobile account. You will be taken to Easypaisa to approve the payment.' },
];
import './checkout.css';

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

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  notes: '',
};

const ADDRESS_KEYS = ['fullName', 'phone', 'address', 'city', 'postalCode'];
const MAX_SAVED_ADDRESSES = 5; // same limit as the backend (utils/addresses.js)

// A saved address (backend shape) as checkout form values. Email and notes belong to this order, so they are kept.
const addressToForm = (a) => ({
  fullName: a.fullName || '',
  phone: a.phone || '',
  address: a.line1 || '',
  city: a.city || '',
  postalCode: a.postalCode || '',
});

const PAKISTANI_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export default function CheckoutPage() {
  const { freeShippingThreshold: FREE_SHIPPING_THRESHOLD, shippingFee: SHIPPING_FEE } = usePolicy(); // from the backend (GET /api/config)
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, count, subtotal, clear, syncItems, hydrated } = useCart();

  const [form, setForm] = useState(EMPTY_FORM);
  const [payment, setPayment] = useState('cod');
  // Which online methods the backend has switched on (GET /api/payments/methods). Until it answers, or if it fails,
  // every online method counts as "Coming soon" and only cash on delivery can be chosen.
  const [available, setAvailable] = useState({});
  const isOnlineMethod = ONLINE_METHODS.includes(payment);
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [order, setOrder] = useState(null); // set once "placed": { id, online, gateway } (online = being sent to the payment gateway)

  const [saved, setSaved] = useState([]); // the customer's saved addresses
  const [selectedId, setSelectedId] = useState(''); // '' = typing a new address
  const [saveNew, setSaveNew] = useState(false); // "save this address to my account"
  const touched = useRef(false); // true once the customer has typed or picked, so the default never overwrites that

  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null); // { code, type, value, discount, subtotal } once a code has been accepted
  const [promoError, setPromoError] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/payments/methods`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.methods && typeof data.methods === 'object') setAvailable(data.methods);
      })
      .catch(() => {}); // keep everything "Coming soon": cash on delivery still works
    return () => controller.abort();
  }, []);

  // Load saved addresses; fill in the default one unless the customer has already started typing
  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    fetch(`${API_URL}/api/addresses`, { credentials: 'include', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.addresses || [];
        setSaved(list);
        const def = list.find((a) => a.isDefault);
        if (def && !touched.current) {
          setForm((f) => ({ ...f, ...addressToForm(def) }));
          setSelectedId(def._id);
        }
      })
      .catch(() => {}); // saved addresses are a convenience: checkout works the same without them
    return () => controller.abort();
  }, [user]);

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const discount = promo ? Math.min(promo.discount, subtotal + shipping) : 0;
  const total = subtotal + shipping - discount;

  // Asks the backend whether `code` works for this subtotal. Resolves to { ok, data } (data = the answer's JSON).
  const checkPromo = async (code, signal) => {
    const res = await fetch(`${API_URL}/api/promos/validate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal }),
      signal,
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  };

  const applyPromo = async (e) => {
    e.preventDefault();
    const code = promoInput.trim();
    if (!code || promoBusy) return;
    setPromoBusy(true);
    setPromoError('');
    try {
      const { ok, data } = await checkPromo(code);
      if (!ok) {
        setPromoError(data.message || 'We could not check that code. Please try again.');
        return;
      }
      setPromo({ code: data.code, type: data.type, value: data.value, discount: data.discount, subtotal });
      setPromoInput('');
    } catch {
      setPromoError('We could not check that code. Please try again.');
    } finally {
      setPromoBusy(false);
    }
  };

  const removePromo = () => {
    setPromo(null);
    setPromoError('');
  };

  // The bag changed after the code was applied (e.g. a price or quantity was refreshed after a 409):
  // ask again, so the discount on screen always matches the items on screen.
  useEffect(() => {
    if (!promo || promo.subtotal === subtotal) return undefined;
    const controller = new AbortController();
    checkPromo(promo.code, controller.signal)
      .then(({ ok, data }) => {
        if (ok) setPromo({ code: data.code, type: data.type, value: data.value, discount: data.discount, subtotal });
        else {
          setPromo(null);
          setPromoError(data.message || 'That code no longer applies to your order.');
        }
      })
      .catch(() => {}); // network trouble: keep what is shown, the order itself is checked by the backend anyway
    return () => controller.abort();
    // checkPromo only reads `subtotal` (a dependency) and state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo, subtotal]);

  const updateField = (key) => (e) => {
    const { value } = e.target;
    if (ADDRESS_KEYS.includes(key)) {
      touched.current = true;
      setSelectedId(''); // edited by hand: no longer exactly the saved address
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  const pickSaved = (e) => {
    const id = e.target.value;
    touched.current = true;
    setSelectedId(id);
    const chosen = saved.find((a) => a._id === id);
    setForm((f) => (chosen ? { ...f, ...addressToForm(chosen) } : { ...f, ...addressToForm({}) }));
    if (chosen) setSaveNew(false);
  };

  // Only a hand-typed address can be saved, and only while there is room
  const canSaveNew = selectedId === '' && saved.length < MAX_SAVED_ADDRESSES;

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Enter your full name.';
    if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email, or leave it blank.';
    if (!form.address.trim()) next.address = 'Enter your delivery address.';
    if (!form.city.trim()) next.city = 'Select or enter your city.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (placing) return;

    const found = validate();
    setErrors(found);
    setSubmitError('');
    if (Object.keys(found).length > 0) return;

    setPlacing(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({ product: it.id, ...(it.variantId ? { variant: it.variantId } : {}), qty: it.qty })),
          total,
          paymentMethod: payment,
          ...(promo ? { promoCode: promo.code } : {}),
          notes: form.notes.trim(),
          shippingAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            line1: form.address.trim(),
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            country: 'Pakistan',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Prices/stock changed: refresh the bag so the summary shows the real numbers
        if (res.status === 409 && Array.isArray(data.currentItems)) syncItems(data.currentItems);
        // The backend refused the promo code (expired, used up...): drop it so the total on screen is the real one
        if (res.status === 409 && data.code === 'PROMO_INVALID') {
          setPromo(null);
          setPromoError('');
        }
        throw new Error(data.message || 'We could not place your order. Please try again.');
      }

      const gateway = isOnlineMethod ? validPayment(data.payment) : null; // payment form from the backend
      setOrder({ id: data.order._id, online: Boolean(gateway), gateway: gatewayName(payment) }); // marks "placed" so the page doesn't flash "bag is empty" while redirecting
      clear(); // only after the backend has saved the order
      if (saveNew && canSaveNew) {
        // Best effort, in the background: the order is already placed, so a failure here must not matter
        fetch(`${API_URL}/api/addresses`, {
          method: 'POST',
          keepalive: true, // still sent if the browser is already moving on to the gateway
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            line1: form.address.trim(),
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
          }),
        }).catch(() => {});
      }
      if (gateway) {
        // Off to the gateway. If the browser could not post the form, fall back to the order page ("Pay now" is there).
        if (!submitPayment(gateway)) router.replace(`/order-success/${data.order._id}`);
        return; // keep the "taking you to the gateway" screen up until the browser leaves
      }
      router.replace(`/order-success/${data.order._id}`); // the thank-you page with the order number
    } catch (err) {
      setSubmitError(err.message || 'We could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const online = isOnlineMethod;
  const cartCount = order ? 0 : count;

  return (
    <>
      <Navbar cartCount={cartCount} />

      <main className={`${serif.variable} ${sans.variable} aur-checkout`}>
        {order ? (
          <div className="aur-checkout__confirm">
            <span className="aur-checkout__confirm-icon">
              <CheckIcon />
            </span>
            {order.online ? (
              <>
                <h1>Taking you to {order.gateway}…</h1>
                <p>
                  Your order is saved. Please complete the payment on the next page and do not close this tab.{' '}
                  <Link href={`/order-success/${order.id}`}>View your order</Link> if nothing happens.
                </p>
              </>
            ) : (
              <>
                <h1>Thank you, your order is placed.</h1>
                <p>
                  Taking you to your confirmation… <Link href={`/order-success/${order.id}`}>Open it now</Link> if nothing happens.
                </p>
              </>
            )}
          </div>
        ) : !hydrated || authLoading ? null : items.length === 0 ? (
          <div className="aur-checkout__empty">
            <h1>Your bag is empty</h1>
            <p>Add a few pieces before checking out.</p>
            <Link href="/shop" className="aur-btn">
              Explore the collection
            </Link>
          </div>
        ) : !user ? (
          <div className="aur-checkout__empty">
            <h1>Sign in to place your order</h1>
            <p>Your bag is saved. Sign in or create an account, then come back to checkout.</p>
            <Link href="/login" className="aur-btn">
              Sign in
            </Link>
            <Link href="/register" className="aur-checkout__link">
              Create an account
            </Link>
          </div>
        ) : user.emailVerified === false ? (
          <div className="aur-checkout__empty">
            <h1>Confirm your email to order</h1>
            <p>Your bag is saved. Once your email address is confirmed you can come straight back and check out.</p>
            <VerifyEmailNotice />
            <Link href="/cart" className="aur-checkout__link">
              Back to my bag
            </Link>
          </div>
        ) : (
          <>
            <h1 className="aur-checkout__title">Checkout</h1>

            <div className="aur-checkout__layout">
              <form className="aur-checkout__form" onSubmit={handleSubmit} noValidate>
                <section>
                  <h2>Delivery details</h2>

                  {saved.length > 0 && (
                    <label>
                      Deliver to
                      <select value={selectedId} onChange={pickSaved}>
                        {saved.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.label ? `${a.label} · ` : ''}
                            {a.line1}, {a.city}
                          </option>
                        ))}
                        <option value="">A new address</option>
                      </select>
                      <Link href="/account/addresses" className="aur-checkout__link aur-checkout__link--inline">
                        Manage saved addresses
                      </Link>
                    </label>
                  )}

                  <label>
                    Full name
                    <input type="text" value={form.fullName} onChange={updateField('fullName')} autoComplete="name" />
                    {errors.fullName && <em>{errors.fullName}</em>}
                  </label>

                  <div className="aur-checkout__grid2">
                    <label>
                      Phone
                      <input type="tel" value={form.phone} onChange={updateField('phone')} placeholder="03xx xxxxxxx" autoComplete="tel" />
                      {errors.phone && <em>{errors.phone}</em>}
                    </label>
                    <label>
                      Email (optional)
                      <input type="email" value={form.email} onChange={updateField('email')} autoComplete="email" />
                      {errors.email && <em>{errors.email}</em>}
                    </label>
                  </div>

                  <label>
                    Address
                    <input type="text" value={form.address} onChange={updateField('address')} placeholder="House no., street, area" autoComplete="street-address" />
                    {errors.address && <em>{errors.address}</em>}
                  </label>

                  <div className="aur-checkout__grid2">
                    <label>
                      City
                      <input type="text" list="aur-cities" value={form.city} onChange={updateField('city')} />
                      <datalist id="aur-cities">
                        {PAKISTANI_CITIES.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      {errors.city && <em>{errors.city}</em>}
                    </label>
                    <label>
                      Postal code (optional)
                      <input type="text" value={form.postalCode} onChange={updateField('postalCode')} />
                    </label>
                  </div>

                  {canSaveNew && (
                    <label className="aur-checkout__check">
                      <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} />
                      Save this address to my account
                    </label>
                  )}

                  <label>
                    Delivery notes (optional)
                    <textarea rows={2} value={form.notes} onChange={updateField('notes')} placeholder="Landmark, preferred time, etc." />
                  </label>
                </section>

                <section>
                  <h2>Payment</h2>
                  <div className="aur-checkout__pay">
                    <label className={`aur-checkout__pay-option ${payment === 'cod' ? 'is-active' : ''}`}>
                      <input type="radio" name="payment" checked={payment === 'cod'} onChange={() => setPayment('cod')} />
                      <span>
                        <strong>Cash on delivery</strong>
                        <small>Pay in cash when your order arrives.</small>
                      </span>
                    </label>
                    {ONLINE_OPTIONS.map((opt) => {
                      const on = available[opt.value] === true;
                      return (
                        <label key={opt.value} className={`aur-checkout__pay-option ${payment === opt.value ? 'is-active' : ''} ${on ? '' : 'is-disabled'}`}>
                          <input type="radio" name="payment" checked={payment === opt.value} disabled={!on} onChange={() => setPayment(opt.value)} />
                          <span>
                            <strong>{opt.title}</strong>
                            <small>{on ? opt.note : 'Not available yet. Please choose cash on delivery.'}</small>
                          </span>
                          {!on && <em className="aur-checkout__soon">Coming soon</em>}
                        </label>
                      );
                    })}
                  </div>
                </section>

                {submitError && (
                  <p className="aur-checkout__error" role="alert">
                    {submitError}
                  </p>
                )}

                <button type="submit" className="aur-btn aur-btn--full" disabled={placing}>
                  {placing ? (online ? 'Preparing payment…' : 'Placing order…') : online ? `Pay ${formatPKR(total)} securely` : `Place order · ${formatPKR(total)}`}
                </button>
              </form>

              <aside className="aur-checkout__summary">
                <h2>Order summary</h2>
                <ul>
                  {items.map((it) => (
                    <li key={it.key || it.id}>
                      <span className="aur-checkout__thumb">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageSrc(it.image)} alt={it.name} />
                        ) : (
                          <span className="aur-checkout__placeholder" />
                        )}
                        <span className="aur-checkout__qty">{it.qty}</span>
                      </span>
                      <span className="aur-checkout__name">
                        {it.name}
                        {(it.size || it.color) && <small style={{ display: 'block', opacity: 0.65 }}>{[it.size, it.color].filter(Boolean).join(' / ')}</small>}
                      </span>
                      <span className="aur-checkout__price">{formatPKR(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                <div className="aur-checkout__promo">
                  {promo ? (
                    <div className="aur-checkout__promo-applied">
                      <span>
                        <strong>{promo.code}</strong> applied
                      </span>
                      <button type="button" onClick={removePromo}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={applyPromo} noValidate>
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Promo code"
                        aria-label="Promo code"
                        aria-invalid={promoError ? 'true' : undefined}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={40}
                      />
                      <button type="submit" disabled={promoBusy || !promoInput.trim()}>
                        {promoBusy ? 'Checking…' : 'Apply'}
                      </button>
                    </form>
                  )}
                  {promoError && (
                    <p className="aur-checkout__promo-error" role="alert">
                      {promoError}
                    </p>
                  )}
                </div>

                <div className="aur-checkout__totals">
                  <div>
                    <span>Subtotal</span>
                    <span>{formatPKR(subtotal)}</span>
                  </div>
                  {promo && discount > 0 && (
                    <div className="is-discount">
                      <span>Discount ({promo.code})</span>
                      <span>−{formatPKR(discount)}</span>
                    </div>
                  )}
                  <div>
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : formatPKR(shipping)}</span>
                  </div>
                  <div className="is-total">
                    <span>Total</span>
                    <span>{formatPKR(total)}</span>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
        .aur-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 52px;
          padding: 0 28px;
          border-radius: 999px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
          font: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.4s var(--ease-out);
        }
      `}</style>
    </>
  );
}