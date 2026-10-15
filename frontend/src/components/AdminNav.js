'use client';

/**
 * Place at: frontend/src/components/AdminNav.js
 * Top navigation shared by every admin page (Products / Orders / Returns / Messages / Customers / Reviews / Promo codes / Subscribers / Newsletter).
 * Shows a small badge for orders waiting to be processed, new return requests and unread messages.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_URL } from '@/lib/imageUrl';
import './styles/AdminNav.css';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders', badge: 'pendingOrders' },
  { href: '/admin/returns', label: 'Returns', badge: 'openReturns' },
  { href: '/admin/messages', label: 'Messages', badge: 'unreadMessages' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/promos', label: 'Promo codes' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/newsletters', label: 'Newsletter' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ pendingOrders: 0, openReturns: 0, unreadMessages: 0 });

  // Badge numbers are a nicety: if either request fails the nav simply shows no badge.
  useEffect(() => {
    let alive = true;
    const get = (path) => fetch(`${API_URL}${path}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([get('/api/orders/admin/all?status=pending'), get('/api/orders/admin/returns?status=requested'), get('/api/contact')]).then(([orders, returns, contact]) => {
      if (!alive) return;
      setCounts({
        pendingOrders: orders?.total ?? orders?.orders?.length ?? 0, // the list is paged, so use the total, not this page's length
        openReturns: returns?.orders?.length || 0,
        unreadMessages: contact?.unread || 0,
      });
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  return (
    <nav className="adm-nav" aria-label="Admin">
      <div className="adm-nav__links">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? 'is-active' : ''}>
            {l.label}
            {l.badge && counts[l.badge] > 0 && <b>{counts[l.badge]}</b>}
          </Link>
        ))}
      </div>
      <Link href="/" className="adm-nav__store">
        View store
      </Link>

    </nav>
  );
}
