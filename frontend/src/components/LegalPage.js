/**
 * Shared frame for the Privacy, Terms and Shipping pages, and for the guides (Size guide, FAQ, Care guide).
 * Guides pass group="guides" (their own set of links at the bottom) and showUpdated={false} (no "last updated" line).
 * Place at: frontend/src/components/LegalPage.js
 *
 * Each page passes its title, an intro and a list of sections ({ id, title, content }); this adds the
 * Navbar, the "on this page" list, the contact block with links to the other policies, and the Footer.
 * Store details (name, email) and the "last updated" date come from lib/store.js.
 */

import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { STORE } from '@/lib/store';
import './styles/Legal.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

const POLICIES = [
  { key: 'privacy', href: '/privacy', label: 'Privacy Policy' },
  { key: 'terms', href: '/terms', label: 'Terms of Service' },
  { key: 'shipping', href: '/shipping', label: 'Shipping Policy' },
];

const GUIDES = [
  { key: 'size-guide', href: '/size-guide', label: 'Size guide' },
  { key: 'care', href: '/care', label: 'Care guide' },
  { key: 'faq', href: '/faq', label: 'FAQ' },
];

export default function LegalPage({ current, eyebrow = 'Legal', title, intro, sections, group = 'legal', showUpdated = true }) {
  const links = group === 'guides' ? [...GUIDES, { key: 'shipping', href: '/shipping', label: 'Shipping Policy' }] : POLICIES;
  return (
    <>
      <Navbar transparent={false} />
      <div className={`${serif.variable} ${sans.variable} legal-wrap`}>
        <main className="legal">
          <p className="legal__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {showUpdated && <p className="legal__updated">Last updated {STORE.legal.lastUpdated}</p>}
          <p className="legal__intro">{intro}</p>

          <nav className="legal__toc" aria-label="On this page">
            <p>On this page</p>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2>{s.title}</h2>
              {s.content}
            </section>
          ))}

          <div className="legal__more">
            <h2>Questions?</h2>
            <p>
              Write to us at <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a> or use the{' '}
              <Link href="/contact">contact form</Link> and we will get back to you.
            </p>
            <div className="legal__links">
              {links.filter((p) => p.key !== current).map((p) => (
                <Link key={p.key} href={p.href}>
                  {p.label}
                </Link>
              ))}
              <Link href="/help">Help &amp; returns</Link>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
