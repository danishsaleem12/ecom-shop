'use client';

/**
 * Place at: frontend/src/app/admin/promos/page.js
 * Promo codes customers can type at checkout. Create, edit, switch on/off and delete.
 *   GET /api/promos?search=&page=&limit= · POST /api/promos · PATCH /api/promos/:id · DELETE /api/promos/:id
 *
 * Three kinds: a percentage off (optionally capped), a fixed amount off, or free shipping.
 * Optional limits: a minimum order, a start / end date, total uses and uses per customer.
 * The backend decides whether a code works; this page only edits the list.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { AdminPager, AdminSearchBox, ADMIN_PAGE_SIZES } from '@/components/AdminListTools';
import { API_URL } from '@/lib/imageUrl';
import './admin-promos.css';

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const day = (iso) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

const TYPES = [
  { value: 'percent', label: 'Percentage off' },
  { value: 'fixed', label: 'Fixed amount off' },
  { value: 'shipping', label: 'Free shipping' },
];

const EMPTY = {
  code: '',
  type: 'percent',
  value: '',
  minSubtotal: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '1',
  startsAt: '',
  expiresAt: '',
  description: '',
  active: true,
};

// <input type="date"> works with local "YYYY-MM-DD". A start date means the start of that day, an end date the end of it.
const toDateInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const startOfDay = (v) => (v ? new Date(`${v}T00:00:00`).toISOString() : '');
const endOfDay = (v) => (v ? new Date(`${v}T23:59:59`).toISOString() : '');

const formFromPromo = (p) => ({
  code: p.code,
  type: p.type,
  value: p.type === 'shipping' ? '' : String(p.value ?? ''),
  minSubtotal: p.minSubtotal > 0 ? String(p.minSubtotal) : '',
  maxDiscount: p.maxDiscount != null ? String(p.maxDiscount) : '',
  usageLimit: p.usageLimit != null ? String(p.usageLimit) : '',
  perUserLimit: p.perUserLimit != null ? String(p.perUserLimit) : '',
  startsAt: toDateInput(p.startsAt),
  expiresAt: toDateInput(p.expiresAt),
  description: p.description || '',
  active: p.active !== false,
});

// What the code does, in one line: "10% off (up to Rs 1,000) · orders over Rs 3,000"
function describe(p) {
  const what = p.type === 'percent' ? `${p.value}% off${p.maxDiscount != null ? ` (up to ${money(p.maxDiscount)})` : ''}` : p.type === 'fixed' ? `${money(p.value)} off` : 'Free shipping';
  return p.minSubtotal > 0 ? `${what} · orders over ${money(p.minSubtotal)}` : what;
}

// Where the code stands right now
function statusOf(p) {
  const now = Date.now();
  if (!p.active) return { cls: '', label: 'Switched off' };
  if (p.expiresAt && new Date(p.expiresAt).getTime() < now) return { cls: 'cancelled', label: 'Expired' };
  if (p.usageLimit != null && p.usedCount >= p.usageLimit) return { cls: 'cancelled', label: 'Used up' };
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { cls: 'processing', label: 'Scheduled' };
  return { cls: 'delivered', label: 'Live' };
}

export default function AdminPromosPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [promos, setPromos] = useState([]);
  const [state, setState] = useState('loading');
  const [query, setQuery] = useState({ search: '', page: 1, limit: ADMIN_PAGE_SIZES[0] });
  const [info, setInfo] = useState({ total: 0, pages: 1 });
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null); // null = form closed, 'new' = creating, or a promo being edited
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const latest = useRef(0); // only the newest request may update the screen

  const { search, page, limit } = query;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const mine = ++latest.current;
      if (!silent) setState('loading');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set('search', search);
        const res = await fetch(`${API_URL}/api/promos?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (mine !== latest.current) return;
        if ((data.promos || []).length === 0 && page > 1 && data.pages < page) {
          setQuery((q) => ({ ...q, page: data.pages })); // the last code on the last page was removed
          return;
        }
        setPromos(data.promos || []);
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

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const setSearch = useCallback((text) => setQuery((q) => ({ ...q, search: text, page: 1 })), []);
  const goPage = (p) => {
    setQuery((q) => ({ ...q, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const setLimit = (n) => setQuery((q) => ({ ...q, limit: n, page: 1 }));

  const openNew = () => {
    setForm(EMPTY);
    setFormError('');
    setEditing('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openEdit = (p) => {
    setForm(formFromPromo(p));
    setFormError('');
    setEditing(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeForm = () => {
    setEditing(null);
    setFormError('');
  };

  const field = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const isNew = editing === 'new';
    setSaving(true);
    setFormError('');

    // "" tells the backend to clear an optional limit
    const body = {
      type: form.type,
      value: form.type === 'shipping' ? 0 : form.value,
      minSubtotal: form.minSubtotal,
      maxDiscount: form.type === 'percent' ? form.maxDiscount : '',
      usageLimit: form.usageLimit,
      perUserLimit: form.perUserLimit,
      startsAt: startOfDay(form.startsAt),
      expiresAt: endOfDay(form.expiresAt),
      description: form.description,
      active: form.active,
      ...(isNew ? { code: form.code } : {}),
    };
    try {
      const res = await fetch(`${API_URL}/api/promos${isNew ? '' : `/${editing._id}`}`, {
        method: isNew ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not save the promo code.');
      setToast(isNew ? `Created ${data.promo?.code || 'promo code'}` : 'Promo code saved');
      closeForm();
      if (isNew && (search || page !== 1)) setQuery((q) => ({ ...q, search: '', page: 1 }));
      else load({ silent: true });
    } catch (err) {
      setFormError(err.message || 'Could not save the promo code.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p) => {
    try {
      const res = await fetch(`${API_URL}/api/promos/${p._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      });
      if (!res.ok) throw new Error('failed');
      setToast(p.active ? `${p.code} switched off` : `${p.code} switched on`);
      load({ silent: true });
    } catch {
      setToast('Could not update — try again');
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.code}? Past orders keep their discount. To stop a code without deleting it, switch it off instead.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/promos/${p._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setToast(`${p.code} deleted`);
      if (editing && editing !== 'new' && editing._id === p._id) closeForm();
      load({ silent: true });
    } catch {
      setToast('Could not delete — try again');
    }
  };

  const isNew = editing === 'new';

  return (
    <AdminShell
      title={`Promo codes${state !== 'error' && (state === 'ready' || promos.length > 0) ? ` (${info.total.toLocaleString()})` : ''}`}
      actions={
        !editing && (
          <button type="button" className="adm__btn" onClick={openNew}>
            New promo code
          </button>
        )
      }
    >
      {editing && (
        <form className="adm-promo__form adm__card" onSubmit={save} noValidate>
          <h2>{isNew ? 'New promo code' : `Edit ${editing.code}`}</h2>

          <div className="adm-promo__grid">
            <label>
              Code
              <input
                type="text"
                value={form.code}
                onChange={field('code')}
                disabled={!isNew}
                placeholder="WELCOME10"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
              />
              <small>{isNew ? '3–32 letters, numbers, - or _. Customers can type it in any case.' : 'A code can’t be renamed, because past orders refer to it.'}</small>
            </label>

            <label>
              Discount type
              <select value={form.type} onChange={field('type')}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {form.type !== 'shipping' && (
              <label>
                {form.type === 'percent' ? 'Percent off' : 'Amount off (Rs)'}
                <input type="number" inputMode="decimal" min="0" step={form.type === 'percent' ? '1' : 'any'} max={form.type === 'percent' ? '100' : undefined} value={form.value} onChange={field('value')} placeholder={form.type === 'percent' ? '10' : '500'} />
              </label>
            )}

            {form.type === 'percent' && (
              <label>
                Maximum discount (Rs)
                <input type="number" inputMode="decimal" min="0" value={form.maxDiscount} onChange={field('maxDiscount')} placeholder="No cap" />
                <small>Stops a big order from getting a huge discount.</small>
              </label>
            )}

            <label>
              Minimum order (Rs)
              <input type="number" inputMode="decimal" min="0" value={form.minSubtotal} onChange={field('minSubtotal')} placeholder="No minimum" />
              <small>Measured on the items, before shipping.</small>
            </label>

            <label>
              Total uses
              <input type="number" inputMode="numeric" min="1" step="1" value={form.usageLimit} onChange={field('usageLimit')} placeholder="Unlimited" />
            </label>

            <label>
              Uses per customer
              <input type="number" inputMode="numeric" min="1" step="1" value={form.perUserLimit} onChange={field('perUserLimit')} placeholder="Unlimited" />
              <small>Cancelled orders don’t count.</small>
            </label>

            <label>
              Starts
              <input type="date" value={form.startsAt} onChange={field('startsAt')} />
            </label>

            <label>
              Ends
              <input type="date" value={form.expiresAt} onChange={field('expiresAt')} />
              <small>Works through the end of this day.</small>
            </label>
          </div>

          <label className="adm-promo__wide">
            Note (only you see this)
            <input type="text" value={form.description} onChange={field('description')} placeholder="e.g. Instagram giveaway, Black Friday" maxLength={120} />
          </label>

          <label className="adm-promo__check">
            <input type="checkbox" checked={form.active} onChange={field('active')} />
            Active (customers can use it)
          </label>

          {formError && (
            <p className="adm__error" role="alert">
              {formError}
            </p>
          )}

          <div className="adm__actions">
            <button type="submit" className="adm__btn" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create code' : 'Save changes'}
            </button>
            <button type="button" className="adm__btn adm__btn--ghost" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="adm__toolbar">
        <AdminSearchBox onSearch={setSearch} label="Search promo codes" placeholder="Search by code or note" />
      </div>

      {state === 'loading' && promos.length === 0 && <p className="adm__note">Loading promo codes…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Couldn&apos;t load promo codes. <button type="button" onClick={() => load()}>Retry</button>
        </p>
      )}
      {state === 'ready' && promos.length === 0 && (
        <p className="adm__note">{search ? `No promo codes match “${search}”.` : 'No promo codes yet. Create one with “New promo code”.'}</p>
      )}

      {state !== 'error' && promos.length > 0 && (
        <ul className={`adm__list${state === 'loading' ? ' is-busy' : ''}`} aria-busy={state === 'loading'}>
          {promos.map((p) => {
            const status = statusOf(p);
            return (
              <li key={p._id} className="adm__card">
                <div className="adm__cardtop">
                  <div>
                    <strong className="adm-promo__code">{p.code}</strong>
                    <span className="adm__meta">{describe(p)}</span>
                    {p.description && <span className="adm__meta adm-promo__note">{p.description}</span>}
                  </div>
                  <span className={`adm__badge${status.cls ? ` adm__badge--${status.cls}` : ''}`}>{status.label}</span>
                </div>

                <p className="adm__meta adm-promo__facts">
                  Used {p.usedCount || 0}
                  {p.usageLimit != null ? ` of ${p.usageLimit}` : ''} · {p.perUserLimit != null ? `${p.perUserLimit} per customer` : 'no limit per customer'}
                  {p.startsAt ? ` · from ${day(p.startsAt)}` : ''}
                  {p.expiresAt ? ` · until ${day(p.expiresAt)}` : ''}
                </p>

                <div className="adm__foot">
                  <span />
                  <span>
                    <button type="button" className="adm__btn adm__btn--ghost" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button type="button" className="adm__btn adm__btn--ghost" onClick={() => toggle(p)}>
                      {p.active ? 'Switch off' : 'Switch on'}
                    </button>
                    <button type="button" className="adm__btn adm__btn--danger" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {state !== 'error' && (
        <AdminPager page={page} pages={info.pages} total={info.total} limit={limit} onPage={goPage} onLimit={setLimit} noun="promo codes" disabled={state === 'loading'} />
      )}

      {toast && <div className="adm__toast">{toast}</div>}

    </AdminShell>
  );
}
