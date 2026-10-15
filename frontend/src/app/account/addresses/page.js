'use client';

/**
 * Place at: frontend/src/app/account/addresses/page.js
 * The customer's saved delivery addresses (up to 5). Checkout lets them pick one of these.
 *   GET / POST /api/addresses,  PUT / DELETE /api/addresses/:id,  PATCH /api/addresses/:id/default
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL } from '@/lib/imageUrl';
import './account-addresses.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

const MAX_ADDRESSES = 5; // same limit as the backend (utils/addresses.js)
const PAKISTANI_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];
const EMPTY = { id: null, label: '', fullName: '', phone: '', line1: '', city: '', postalCode: '', isDefault: false };

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}/api/addresses${path}`, {
    credentials: 'include',
    ...options,
    ...(options.body ? { headers: { 'Content-Type': 'application/json' } } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [addresses, setAddresses] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [form, setForm] = useState(null); // null = closed, otherwise the fields being added / edited
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false); // saving the form
  const [busyId, setBusyId] = useState(null); // an address card action in progress
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const data = await request('');
      setAddresses(data.addresses || []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const atLimit = addresses.length >= MAX_ADDRESSES;
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openNew = () => {
    setFormError('');
    setNotice('');
    setForm({ ...EMPTY, fullName: user?.name || '', isDefault: addresses.length === 0 });
  };
  const openEdit = (a) => {
    setFormError('');
    setNotice('');
    setForm({
      id: a._id,
      label: a.label || '',
      fullName: a.fullName || '',
      phone: a.phone || '',
      line1: a.line1 || '',
      city: a.city || '',
      postalCode: a.postalCode || '',
      isDefault: !!a.isDefault,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError('');
    setBusy(true);
    try {
      const { id, ...fields } = form;
      const data = await request(id ? `/${id}` : '', { method: id ? 'PUT' : 'POST', body: JSON.stringify(fields) });
      setAddresses(data.addresses || []);
      setForm(null);
      setNotice(id ? 'Address updated.' : 'Address saved.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (a) => {
    setBusyId(a._id);
    setNotice('');
    try {
      const data = await request(`/${a._id}/default`, { method: 'PATCH' });
      setAddresses(data.addresses || []);
      setNotice('Default address updated.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete the address "${a.label || a.line1}"?`)) return;
    setBusyId(a._id);
    setNotice('');
    try {
      const data = await request(`/${a._id}`, { method: 'DELETE' });
      setAddresses(data.addresses || []);
      if (form?.id === a._id) setForm(null);
      setNotice('Address deleted.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
      <main className={`${serif.variable} ${sans.variable} acc-addr`}>
        <p className="acc-addr__eyebrow">Account</p>
        <h1>Saved addresses</h1>

        <nav className="acc-addr__tabs" aria-label="Account">
          <Link href="/account">Details</Link>
          <Link href="/account/addresses" aria-current="page" className="is-active">
            Addresses
          </Link>
          <Link href="/account/orders">Orders</Link>
        </nav>

        {!authLoading && !user && (
          <div className="acc-addr__empty">
            <p>You need to sign in to manage your addresses.</p>
            <Link href="/login" className="acc-addr__btn">
              Sign in
            </Link>
          </div>
        )}

        {user && (
          <>
            {state === 'loading' && <p className="acc-addr__note">Loading your addresses…</p>}
            {state === 'error' && (
              <p className="acc-addr__note acc-addr__note--error">
                Couldn&apos;t load your addresses. <button type="button" onClick={load}>Retry</button>
              </p>
            )}

            {notice && (
              <p className="acc-addr__note" role="status">
                {notice}
              </p>
            )}

            {state === 'ready' && addresses.length === 0 && !form && (
              <p className="acc-addr__note">You haven&apos;t saved an address yet. Add one and checkout will fill it in for you.</p>
            )}

            {state === 'ready' && addresses.length > 0 && (
              <ul className="acc-addr__list">
                {addresses.map((a) => (
                  <li key={a._id} className={`acc-addr__card ${a.isDefault ? 'is-default' : ''}`}>
                    <div className="acc-addr__top">
                      <strong>{a.label || 'Address'}</strong>
                      {a.isDefault && <span className="acc-addr__badge">Default</span>}
                    </div>
                    <p>
                      {a.fullName}
                      <br />
                      {a.line1}
                      <br />
                      {[a.city, a.postalCode].filter(Boolean).join(' ')}, Pakistan
                      <br />
                      {a.phone}
                    </p>
                    <div className="acc-addr__actions">
                      <button type="button" onClick={() => openEdit(a)} disabled={busyId === a._id}>
                        Edit
                      </button>
                      {!a.isDefault && (
                        <button type="button" onClick={() => makeDefault(a)} disabled={busyId === a._id}>
                          Make default
                        </button>
                      )}
                      <button type="button" className="is-danger" onClick={() => remove(a)} disabled={busyId === a._id}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {state === 'ready' && !form && (
              <div className="acc-addr__add">
                <button type="button" className="acc-addr__btn" onClick={openNew} disabled={atLimit}>
                  Add a new address
                </button>
                {atLimit && <small>You can save up to {MAX_ADDRESSES} addresses. Delete one to add another.</small>}
              </div>
            )}

            {form && (
              <form className="acc-addr__form" onSubmit={submit}>
                <h2>{form.id ? 'Edit address' : 'New address'}</h2>

                <label>
                  Label (optional)
                  <input type="text" value={form.label} onChange={setField('label')} placeholder="Home, Office…" maxLength={30} />
                </label>
                <label>
                  Full name
                  <input type="text" required value={form.fullName} onChange={setField('fullName')} autoComplete="name" maxLength={80} />
                </label>
                <label>
                  Phone
                  <input type="tel" required value={form.phone} onChange={setField('phone')} placeholder="03xx xxxxxxx" autoComplete="tel" maxLength={20} />
                </label>
                <label>
                  Address
                  <input type="text" required value={form.line1} onChange={setField('line1')} placeholder="House no., street, area" autoComplete="street-address" maxLength={200} />
                </label>
                <div className="acc-addr__grid2">
                  <label>
                    City
                    <input type="text" required list="acc-addr-cities" value={form.city} onChange={setField('city')} maxLength={60} />
                    <datalist id="acc-addr-cities">
                      {PAKISTANI_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Postal code (optional)
                    <input type="text" value={form.postalCode} onChange={setField('postalCode')} maxLength={12} />
                  </label>
                </div>

                <label className="acc-addr__check">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    disabled={addresses.length === 0 || (!!form.id && addresses.find((a) => a._id === form.id)?.isDefault)}
                  />
                  Use as my default address
                </label>

                {formError && (
                  <p className="acc-addr__msg" role="alert">
                    {formError}
                  </p>
                )}

                <div className="acc-addr__formbtns">
                  <button type="submit" className="acc-addr__btn" disabled={busy}>
                    {busy ? 'Saving…' : 'Save address'}
                  </button>
                  <button type="button" className="acc-addr__btn acc-addr__btn--ghost" onClick={() => setForm(null)} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
      <Footer />

    </>
  );
}
