'use client';

/**
 * Place at: frontend/src/components/StatusPage.js
 * One layout for the "something is not right" screens: the 404 page (app/not-found.js) and the
 * error page (app/error.js). Same look as the rest of the store: Navbar, cream page, serif title, Footer.
 *
 * Props:
 *   code       big muted text above the title, e.g. "404"
 *   title      main heading
 *   text       one or two friendly sentences
 *   primary    { label, href } or { label, onClick }   the main button
 *   secondary  same shape, optional                     the quieter button
 *   links      [{ label, href }]                        small helpful links under the buttons
 *   reference  optional error reference (the error digest) so a customer can quote it to support
 */

import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import './styles/StatusPage.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

function Action({ action, className }) {
  if (!action) return null;
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

export default function StatusPage({ code, title, text, primary, secondary, links = [], reference }) {
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />

      <main className={`${serif.variable} ${sans.variable} aur-status`}>
        {code && <p className="aur-status__code" aria-hidden="true">{code}</p>}
        <h1>{title}</h1>
        {text && <p className="aur-status__text">{text}</p>}

        <div className="aur-status__actions">
          <Action action={primary} className="aur-status__btn" />
          <Action action={secondary} className="aur-status__btn aur-status__btn--ghost" />
        </div>

        {links.length > 0 && (
          <nav className="aur-status__links" aria-label="Helpful links">
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {reference && <p className="aur-status__ref">Reference: {reference}</p>}
      </main>

      <Footer />

    </>
  );
}
