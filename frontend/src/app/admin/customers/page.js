'use client';

/**
 * Place at: frontend/src/app/admin/customers/page.js
 * Everyone with an account: see how much they have ordered, open their latest orders, promote a customer to admin,
 * remove someone's admin access, or create a new admin account.
 *   GET /api/users?role=&search=&page=&limit= · GET /api/users/:id · PATCH /api/users/:id/role · POST /api/users/admin
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { AdminPager, AdminSearchBox, ADMIN_PAGE_SIZES } from '@/components/AdminListTools';
import { API_URL } from '@/lib/imageUrl';
import './admin-customers.css';

const FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'user', label: 'Customers' },
  { value: 'admin', label: 'Admins' },
];
const NEW_ADMIN = { name: '', email: '', password: '' };

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const day = (d) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function AdminCustomersPage() {
  const { user: me, isAdmin, loading: authLoading } = useAuth();
  const [people, setPeople] = useState([]);
  const [state, setState] = useState('loading');
  const [query, setQuery] = useState({ role: '', search: '', page: 1, limit: ADMIN_PAGE_SIZES[0] });
  const [info, setInfo] = useState({ total: 0, pages: 1, admins: 0 });
  const [open, setOpen] = useState(null); // { id, orders } | { id, loading } for the expanded row
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(NEW_ADMIN);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const latest = useRef(0); // only the newest request may update the screen

  const { role, search, page, limit } = query;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const mine = ++latest.current;
      if (!silent) setState('loading');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (role) params.set('role', role);
        if (search) params.set('search', search);
        const res = await fetch(`${API_URL}/api/users?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (mine !== latest.current) return;
        if ((data.users || []).length === 0 && page > 1 && data.pages < page) {
          setQuery((q) => ({ ...q, page: data.pages }));
          return;
        }
        setPeople(data.users || []);
        setInfo({ total: data.total || 0, pages: data.pages || 1, admins: data.admins || 0 });
        setState('ready');
      } catch {
        if (mine === latest.current) setState('error');
      }
    },
    [role, search, page, limit]
  );

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const setSearch = useCallback((text) => setQuery((q) => ({ ...q, search: text, page: 1 })), []);
  const setRole = (value) => setQuery((q) => ({ ...q, role: value, page: 1 }));
  const goPage = (p) => {
    setQuery((q) => ({ ...q, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const setLimit = (n) => setQuery((q) => ({ ...q, limit: n, page: 1 }));

  const toggleOrders = async (u) => {
    if (open?.id === u._id) {
      setOpen(null);
      return;
    }
    setOpen({ id: u._id, loading: true });
    try {
      const res = await fetch(`${API_URL}/api/users/${u._id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setOpen((o) => (o?.id === u._id ? { id: u._id, orders: data.recentOrders || [] } : o));
    } catch {
      setOpen(null);
      setToast('Could not load their orders');
    }
  };

  const changeRole = async (u) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    const question =
      next === 'admin'
        ? `Make ${u.name} (${u.email}) an admin?\n\nThey will be able to manage products, orders, customers and everything else in this admin area. They sign in on the admin login page.`
        : `Remove admin access from ${u.name} (${u.email})?\n\nThey are signed out everywhere right away and become a normal customer.`;
    if (!window.confirm(question)) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${u._id}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: next }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.message || 'failed');
      setToast(next === 'admin' ? `${u.name} is now an admin` : `${u.name} is now a customer`);
      load({ silent: true });
    } catch (err) {
      setToast(err.message === 'failed' ? 'Could not change the role — try again' : err.message);
    }
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_URL}/api/users/admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.message || 'Could not create the account');
      setForm(NEW_ADMIN);
      setAdding(false);
      setToast(`Admin account created for ${data.user?.email || 'them'}`);
      load({ silent: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <AdminShell
      title={`Customers${state === 'ready' ? ` (${info.total.toLocaleString()})` : ''}`}
      actions={
        <button type="button" className="adm__btn" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
          {adding ? 'Cancel' : 'Add admin'}
        </button>
      }
    >
      {adding && (
        <form className="cu__form" onSubmit={createAdmin}>
          <h2>New admin account</h2>
          <div className="cu__grid">
            <label>
              <span>Name</span>
              <input type="text" value={form.name} onChange={setField('name')} maxLength={80} required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={form.email} onChange={setField('email')} maxLength={120} required />
            </label>
            <label>
              <span>Password (8+ characters)</span>
              <input type="password" value={form.password} onChange={setField('password')} minLength={8} autoComplete="new-password" required />
            </label>
          </div>
          {formError && (
            <p className="adm__note is-error" role="alert">
              {formError}
            </p>
          )}
          <button type="submit" className="adm__btn" disabled={saving}>
            {saving ? 'Creating…' : 'Create admin'}
          </button>
        </form>
      )}

      <div className="adm__tabs" role="group" aria-label="Filter accounts">
        {FILTERS.map((f) => (
          <button key={f.value || 'all'} type="button" className={role === f.value ? 'is-active' : ''} aria-pressed={role === f.value} onClick={() => setRole(f.value)}>
            {f.label}
            {f.value === 'admin' && state === 'ready' ? ` (${info.admins})` : ''}
          </button>
        ))}
      </div>
      <div className="adm__toolbar">
        <AdminSearchBox onSearch={setSearch} label="Search accounts" placeholder="Search by name or email" />
      </div>

      {state === 'loading' && people.length === 0 && <p className="adm__note">Loading accounts…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load accounts. <button type="button" onClick={() => load()}>Retry</button>
        </p>
      )}
      {state === 'ready' && people.length === 0 && <p className="adm__note">{search || role ? 'No accounts match.' : 'No accounts yet.'}</p>}

      {state !== 'error' && people.length > 0 && (
        <ul className={`adm__list${state === 'loading' ? ' is-busy' : ''}`} aria-busy={state === 'loading'}>
          {people.map((u) => {
            const self = me && String(me.id) === String(u._id);
            return (
              <li key={u._id} className="adm__card">
                <div className="adm__cardtop">
                  <div>
                    <strong>
                      {u.name}{' '}
                      {u.role === 'admin' && <span className="adm__badge adm__badge--shipped">Admin</span>}{' '}
                      {!u.emailVerified && <span className="adm__badge adm__badge--cancelled">Email not confirmed</span>}
                    </strong>
                    <span className="adm__meta">{u.email}</span>
                  </div>
                  <span className="adm__meta">Joined {day(u.createdAt)}</span>
                </div>
                <p className="adm__meta">
                  {u.orders === 0 ? 'No orders yet' : `${u.orders} ${u.orders === 1 ? 'order' : 'orders'} · ${money(u.spent)} spent · last on ${day(u.lastOrderAt)}`}
                </p>

                {open?.id === u._id && (
                  <div className="cu__orders">
                    {open.loading && <p className="adm__meta">Loading…</p>}
                    {open.orders?.length === 0 && <p className="adm__meta">No orders.</p>}
                    {open.orders?.map((o) => (
                      <p key={o._id} className="adm__meta">
                        <strong>{o.orderNumber || String(o._id).slice(-8).toUpperCase()}</strong> · {day(o.createdAt)} · {o.status} · {money(o.total)}
                      </p>
                    ))}
                  </div>
                )}

                <div className="adm__foot">
                  <span>
                    <button type="button" className="adm__btn adm__btn--ghost" onClick={() => toggleOrders(u)} aria-expanded={open?.id === u._id}>
                      {open?.id === u._id ? 'Hide orders' : 'Latest orders'}
                    </button>
                    <a className="adm__btn adm__btn--ghost" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={`mailto:${u.email}`}>
                      Email
                    </a>
                  </span>
                  {self ? (
                    <span className="adm__meta">This is you</span>
                  ) : (
                    <button type="button" className={`adm__btn ${u.role === 'admin' ? 'adm__btn--danger' : 'adm__btn--ghost'}`} onClick={() => changeRole(u)}>
                      {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {info.total > 0 && state !== 'error' && (
        <AdminPager page={page} pages={info.pages} total={info.total} limit={limit} onPage={goPage} onLimit={setLimit} noun="accounts" disabled={state === 'loading'} />
      )}

      {toast && <div className="adm__toast">{toast}</div>}

    </AdminShell>
  );
}
