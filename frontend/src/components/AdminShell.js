'use client';

/**
 * Place at: frontend/src/components/AdminShell.js
 * Page frame for the admin Orders / Messages / Subscribers pages: checks the user is an admin
 * (the backend enforces it too), shows the nav and the page title, and holds the shared admin styles.
 */

import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import AdminNav from '@/components/AdminNav';
import './styles/AdminShell.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function AdminShell({ title, children, actions }) {
  const { user, loading, isAdmin } = useAuth();

  return (
    <main className={`${serif.variable} ${sans.variable} adm`}>
      {loading && <p className="adm__note">Checking access…</p>}

      {!loading && !isAdmin && (
        <div className="adm__denied">
          <p className="adm__eyebrow">Aurelia · Admin</p>
          <h1>Admin access required</h1>
          <p className="adm__note">{user ? 'Your account does not have admin access.' : 'Sign in on the admin login page.'}</p>
          <Link href="/admin/login" className="adm__link">
            Admin sign in
          </Link>
        </div>
      )}

      {!loading && isAdmin && (
        <>
          <AdminNav />
          <div className="adm__head">
            <div>
              <p className="adm__eyebrow">Aurelia · Admin</p>
              <h1>{title}</h1>
            </div>
            {actions && <div className="adm__actions">{actions}</div>}
          </div>
          {children}
        </>
      )}

    </main>
  );
}
