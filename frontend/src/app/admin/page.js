'use client';

/**
 * Place at: frontend/src/app/admin/page.js
 * Admin dashboard: sales, orders today, things that need attention, low stock and best sellers.
 *   GET /api/admin/stats   (one request, admin only)
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminShell from '@/components/AdminShell';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { orderRef } from '@/lib/orderRef';
import './admin-home.css';

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const shortDay = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const when = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// "+12%" / "-8%" against the week before; null when there is nothing to compare with
const change = (now, before) => {
  if (!before) return now > 0 ? { text: 'new', up: true } : null;
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
};

const variantText = (v) => [v.size, v.color].filter(Boolean).join(' / ');

function Stat({ label, value, sub, delta }) {
  return (
    <div className="dash__stat">
      <span className="dash__label">{label}</span>
      <strong>{value}</strong>
      <span className="dash__sub">
        {sub}
        {delta && <b className={delta.up ? 'is-up' : 'is-down'}> {delta.text} vs last week</b>}
      </span>
    </div>
  );
}

function SalesChart({ days }) {
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const total = days.reduce((n, d) => n + d.revenue, 0);
  return (
    <figure className="dash__chart">
      <div className="dash__bars" role="img" aria-label={`Sales per day for the last ${days.length} days, ${money(total)} in total`}>
        {days.map((d) => (
          <span
            key={d.date}
            className="dash__bar"
            style={{ height: `${Math.max(d.revenue > 0 ? 4 : 1, (d.revenue / max) * 100)}%` }}
            title={`${shortDay(d.date)}: ${money(d.revenue)} · ${d.orders} order${d.orders === 1 ? '' : 's'}`}
          />
        ))}
      </div>
      <figcaption>
        <span>{shortDay(days[0].date)}</span>
        <span>Peak day {money(max === 1 && total === 0 ? 0 : max)}</span>
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

export default function AdminDashboardPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setData(await res.json());
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  const refresh = (
    <button type="button" className="adm__btn adm__btn--ghost" onClick={load} disabled={state === 'loading'}>
      {state === 'loading' ? 'Refreshing…' : 'Refresh'}
    </button>
  );

  return (
    <AdminShell title="Dashboard" actions={refresh}>
      {state === 'loading' && !data && <p className="adm__note">Loading the numbers…</p>}
      {state === 'error' && (
        <p className="adm__note is-error">
          Could not load the dashboard. <button onClick={load}>Try again</button>
        </p>
      )}

      {data && (
        <div className="dash">
          <section className="dash__stats" aria-label="Sales summary">
            <Stat label="Today" value={money(data.today.revenue)} sub={`${data.today.orders} order${data.today.orders === 1 ? '' : 's'}`} />
            <Stat
              label="Last 7 days"
              value={money(data.week.revenue)}
              sub={`${data.week.orders} orders`}
              delta={change(data.week.revenue, data.week.prevRevenue)}
            />
            <Stat label="Last 30 days" value={money(data.month.revenue)} sub={`${data.month.orders} orders`} />
            <Stat label="All time" value={money(data.allTime.revenue)} sub={`${data.allTime.orders} orders`} />
          </section>

          <section className="dash__attention" aria-label="Needs attention">
            <Link href="/admin/orders" className={data.attention.pendingOrders ? 'is-hot' : ''}>
              <strong>{data.attention.pendingOrders}</strong> new order{data.attention.pendingOrders === 1 ? '' : 's'} to process
            </Link>
            <Link href="/admin/returns" className={data.attention.openReturns ? 'is-hot' : ''}>
              <strong>{data.attention.openReturns}</strong> return request{data.attention.openReturns === 1 ? '' : 's'} waiting
            </Link>
            <Link href="/admin/products" className={data.attention.lowStock ? 'is-hot' : ''}>
              <strong>{data.attention.lowStock}</strong> product{data.attention.lowStock === 1 ? '' : 's'} low on stock
            </Link>
          </section>

          <section className="dash__panel">
            <h2>Sales, last 30 days</h2>
            <SalesChart days={data.days} />
            <p className="dash__fine">Cancelled orders and refunded returns are not counted. Days follow {data.timezone} time.</p>
          </section>

          <div className="dash__two">
            <section className="dash__panel">
              <h2>Low stock</h2>
              <p className="dash__fine">{data.lowStockThreshold} units or fewer</p>
              {data.lowStock.length === 0 ? (
                <p className="adm__note">Everything is well stocked.</p>
              ) : (
                <ul className="dash__rows">
                  {data.lowStock.map((p) => (
                    <li key={p._id}>
                      <Link href="/admin/products" className="dash__thumb" aria-hidden="true" tabIndex={-1}>
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageSrc(p.image)} alt="" />
                        )}
                      </Link>
                      <span className="dash__rowtext">
                        <Link href="/admin/products">{p.name}</Link>
                        {p.variants && p.variants.length > 0 && (
                          <small>{p.variants.map((v) => `${variantText(v)}: ${v.stock}`).join(' · ')}</small>
                        )}
                      </span>
                      <b className={p.variants ? (p.variants.some((v) => v.stock === 0) ? 'dash__pill is-zero' : 'dash__pill') : p.stock === 0 ? 'dash__pill is-zero' : 'dash__pill'}>
                        {p.variants ? `${p.stock} total` : p.stock === 0 ? 'Sold out' : `${p.stock} left`}
                      </b>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dash__panel">
              <h2>Best sellers</h2>
              <p className="dash__fine">By units, last 30 days</p>
              {data.topProducts.length === 0 ? (
                <p className="adm__note">No sales in the last 30 days yet.</p>
              ) : (
                <ol className="dash__rows dash__rows--ranked">
                  {data.topProducts.map((p) => (
                    <li key={p._id || p.name}>
                      <span className="dash__thumb" aria-hidden="true">
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageSrc(p.image)} alt="" />
                        )}
                      </span>
                      <span className="dash__rowtext">
                        {p.name}
                        <small>{money(p.revenue)}</small>
                      </span>
                      <b className="dash__pill">{p.units} sold</b>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="dash__panel">
            <h2>Latest orders</h2>
            {data.recentOrders.length === 0 ? (
              <p className="adm__note">No orders yet.</p>
            ) : (
              <ul className="dash__rows">
                {data.recentOrders.map((o) => (
                  <li key={o._id}>
                    <span className="dash__rowtext">
                      <Link href="/admin/orders">#{orderRef(o)}</Link>
                      <small>
                        {o.shippingAddress?.fullName || 'Customer'} · {when(o.createdAt)}
                      </small>
                    </span>
                    <span className={`adm__badge adm__badge--${o.status}`}>{o.status}</span>
                    <b>{money(o.total)}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

    </AdminShell>
  );
}
