'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · CHECKOUT PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/checkout/page.js
 *
 *  IMPORTANT — there is no backend Order model or /api/orders route yet,
 *  so "Place order" here does NOT hit your API. It validates the form,
 *  then locally: generates a reference number, clears the cart via
 *  useCart().clear(), and shows a confirmation screen. Nothing is
 *  persisted anywhere — refreshing the confirmation screen loses it,
 *  and there's no record of the order on the backend or in a database.
 *
 *  To make this real you'd need, at minimum:
 *   - backend/models/Order.js (items, shipping address, total, status)
 *   - POST /api/orders in a new orders.routes.js, called from handleSubmit
 *     below instead of the local-only logic
 *   - decrementing each product's `stock` when an order is placed
 *  Happy to build that next — say the word.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { imageSrc } from '@/lib/imageUrl';

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

const FREE_SHIPPING_THRESHOLD = 15000;
const SHIPPING_FEE = 350;

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

const PAKISTANI_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export default function CheckoutPage() {
  const router = useRouter();
  const { items, count, subtotal, clear, hydrated } = useCart();

  const [form, setForm] = useState(EMPTY_FORM);
  const [payment, setPayment] = useState('cod');
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState(null); // set once "placed"

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  const updateField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Enter your full name.';
    if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email, or leave it blank.';
    if (!form.address.trim()) next.address = 'Enter your delivery address.';
    if (!form.city.trim()) next.city = 'Select or enter your city.';
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPlacing(true);

    // No backend order endpoint exists yet — this is a local-only
    // confirmation. See the file header for what a real version needs.
    const reference = `AUR-${Date.now().toString().slice(-8)}`;
    setTimeout(() => {
      setOrder({
        reference,
        items,
        total,
        shipping,
        subtotal,
        address: form,
        payment,
      });
      clear();
      setPlacing(false);
    }, 500);
  };

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
            <h1>Thank you, your order is placed.</h1>
            <p>
              Reference <strong>{order.reference}</strong>. You&apos;ll pay {order.payment === 'cod' ? 'on delivery' : 'by card'} — a confirmation has been noted for {order.address.fullName}.
            </p>

            <div className="aur-checkout__recap">
              <div>
                <span>Subtotal</span>
                <span>{formatPKR(order.subtotal)}</span>
              </div>
              <div>
                <span>Shipping</span>
                <span>{order.shipping === 0 ? 'Free' : formatPKR(order.shipping)}</span>
              </div>
              <div className="is-total">
                <span>Total</span>
                <span>{formatPKR(order.total)}</span>
              </div>
            </div>

            <Link href="/shop" className="aur-btn">
              Continue shopping
            </Link>
          </div>
        ) : !hydrated ? null : items.length === 0 ? (
          <div className="aur-checkout__empty">
            <h1>Your bag is empty</h1>
            <p>Add a few pieces before checking out.</p>
            <Link href="/shop" className="aur-btn">
              Explore the collection
            </Link>
          </div>
        ) : (
          <>
            <h1 className="aur-checkout__title">Checkout</h1>

            <div className="aur-checkout__layout">
              <form className="aur-checkout__form" onSubmit={handleSubmit} noValidate>
                <section>
                  <h2>Delivery details</h2>

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
                    <label className="aur-checkout__pay-option is-disabled">
                      <input type="radio" name="payment" disabled />
                      <span>
                        <strong>Card</strong>
                        <small>Coming soon.</small>
                      </span>
                    </label>
                  </div>
                </section>

                <button type="submit" className="aur-btn aur-btn--full" disabled={placing}>
                  {placing ? 'Placing order…' : `Place order · ${formatPKR(total)}`}
                </button>
              </form>

              <aside className="aur-checkout__summary">
                <h2>Order summary</h2>
                <ul>
                  {items.map((it) => (
                    <li key={it.id}>
                      <span className="aur-checkout__thumb">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageSrc(it.image)} alt={it.name} />
                        ) : (
                          <span className="aur-checkout__placeholder" />
                        )}
                        <span className="aur-checkout__qty">{it.qty}</span>
                      </span>
                      <span className="aur-checkout__name">{it.name}</span>
                      <span className="aur-checkout__price">{formatPKR(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                <div className="aur-checkout__totals">
                  <div>
                    <span>Subtotal</span>
                    <span>{formatPKR(subtotal)}</span>
                  </div>
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

      <style jsx global>{`
        .aur-checkout {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.14);
          --error: #a44b3f;
          --gutter: clamp(20px, 5.2vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          min-height: 70vh;
          background: var(--cream);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          padding: clamp(110px, 12vw, 150px) var(--gutter) 80px;
        }

        .aur-checkout__title {
          margin: 0 0 clamp(28px, 4vw, 44px);
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.9rem, 3vw, 2.6rem);
        }

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
        .aur-btn:hover {
          transform: translateY(-2px);
        }
        .aur-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .aur-btn--full {
          width: 100%;
        }

        /* ── empty / confirmation states ────────────────────────────── */
        .aur-checkout__empty,
        .aur-checkout__confirm {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          max-width: 460px;
          margin: 60px auto 0;
          padding: 0 12px;
          text-align: center;
        }
        .aur-checkout__empty h1,
        .aur-checkout__confirm h1 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.9rem;
        }
        .aur-checkout__empty p,
        .aur-checkout__confirm p {
          margin: 0 0 22px;
          color: rgba(24, 21, 19, 0.65);
        }
        .aur-checkout__confirm-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          margin-bottom: 18px;
          border-radius: 50%;
          background: #e7efe6;
          color: #4c6b45;
        }
        .aur-checkout__confirm strong {
          color: var(--ink);
        }
        .aur-checkout__recap {
          width: 100%;
          margin: 8px 0 26px;
          padding: 18px 20px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: #fff;
          text-align: left;
        }
        .aur-checkout__recap div {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 0.9rem;
        }
        .aur-checkout__recap .is-total {
          margin-top: 6px;
          padding-top: 12px;
          border-top: 1px solid var(--line);
          font-weight: 500;
        }

        /* ── layout ─────────────────────────────────────────────────── */
        .aur-checkout__layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
          gap: clamp(28px, 4vw, 56px);
          align-items: start;
        }

        .aur-checkout__form {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        .aur-checkout__form section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .aur-checkout__form h2 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.25rem;
        }
        .aur-checkout__form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .aur-checkout__form input,
        .aur-checkout__form textarea {
          padding: 11px 13px;
          border-radius: 8px;
          border: 1px solid rgba(24, 21, 19, 0.22);
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-size: 0.92rem;
          resize: vertical;
        }
        .aur-checkout__form input:focus,
        .aur-checkout__form textarea:focus {
          outline: 2px solid var(--copper);
          outline-offset: 1px;
        }
        .aur-checkout__form em {
          font-style: normal;
          font-size: 0.78rem;
          color: var(--error);
        }
        .aur-checkout__grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .aur-checkout__pay {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .aur-checkout__pay-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(24, 21, 19, 0.22);
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.25s ease, background 0.25s ease;
        }
        .aur-checkout__pay-option.is-active {
          border-color: var(--copper);
          background: rgba(201, 138, 99, 0.08);
        }
        .aur-checkout__pay-option.is-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .aur-checkout__pay-option input {
          width: 15px;
          height: 15px;
          accent-color: var(--copper);
        }
        .aur-checkout__pay-option span {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .aur-checkout__pay-option small {
          font-size: 0.78rem;
          color: rgba(24, 21, 19, 0.55);
        }

        /* ── summary ────────────────────────────────────────────────── */
        .aur-checkout__summary {
          position: sticky;
          top: 100px;
          padding: 24px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: #fff;
        }
        .aur-checkout__summary h2 {
          margin: 0 0 16px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.2rem;
        }
        .aur-checkout__summary ul {
          margin: 0 0 16px;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .aur-checkout__summary li {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
        }
        .aur-checkout__thumb {
          position: relative;
          display: block;
          width: 48px;
          height: 58px;
          border-radius: 4px;
          overflow: hidden;
          background: #e4d9cd;
        }
        .aur-checkout__thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .aur-checkout__placeholder {
          display: block;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ece1d5, #d9c8b5);
        }
        .aur-checkout__qty {
          position: absolute;
          top: -6px;
          right: -6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 999px;
          background: var(--ink);
          color: var(--cream);
          font-size: 0.66rem;
        }
        .aur-checkout__name {
          font-size: 0.86rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .aur-checkout__price {
          font-size: 0.86rem;
          white-space: nowrap;
        }
        .aur-checkout__totals {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--line);
        }
        .aur-checkout__totals div {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }
        .aur-checkout__totals .is-total {
          padding-top: 10px;
          margin-top: 4px;
          border-top: 1px solid var(--line);
          font-weight: 500;
          font-size: 1rem;
        }

        @media (max-width: 860px) {
          .aur-checkout__layout {
            grid-template-columns: 1fr;
          }
          .aur-checkout__summary {
            position: static;
            order: -1;
          }
        }
        @media (max-width: 520px) {
          .aur-checkout__grid2 {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aur-checkout * {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}