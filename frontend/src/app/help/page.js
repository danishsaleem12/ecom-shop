'use client';

/**
 * Place at: frontend/src/app/help/page.js
 */

import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

const FAQS = [
    {
        q: 'How long does delivery take?',
        a: 'Orders within the city typically arrive in 2–4 business days. Nationwide delivery usually takes 4–7 business days from the day your order is placed.',
    },
    {
        q: 'What is your returns policy?',
        a: 'We accept returns within 14 days of delivery for unworn, unwashed items with tags still attached. Once we receive your return, refunds are processed within 5–7 business days.',
    },
    {
        q: 'How do I return or exchange an item?',
        a: 'Sign in to your account, go to Orders, and select the order you\u2019d like to return. If you checked out as a guest, contact us using the details below and we\u2019ll help you along.',
    },
    {
        q: 'Do you offer free shipping?',
        a: 'Yes — orders over Rs 15,000 ship free. Orders below that threshold have a flat shipping fee calculated at checkout.',
    },
    {
        q: 'Can I change or cancel my order after placing it?',
        a: 'If your order hasn\u2019t shipped yet, contact us as soon as possible and we\u2019ll do our best to accommodate changes or cancellations.',
    },
];

export default function HelpPage() {
    const { count: cartCount } = useCart();
    const { count: wishlistCount } = useWishlist();

    return (
        <>
            <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
            <main className={`${serif.variable} ${sans.variable} help`}>
                <p className="help__eyebrow">Support</p>
                <h1>Help &amp; returns</h1>
                <p className="help__sub">Answers to the questions we hear most. Can&apos;t find what you need? Reach out below.</p>

                <div className="help__faqs">
                    {FAQS.map((item) => (
                        <details key={item.q} className="help__item">
                            <summary>{item.q}</summary>
                            <p>{item.a}</p>
                        </details>
                    ))}
                </div>

                <div className="help__contact">
                    <h2>Still need help?</h2>
                    <p>Our team is happy to help with orders, sizing, or anything else.</p>
                    <div className="help__contactRow">
                        <a href="mailto:support@aurelia.com">support@aurelia.com</a>
                        <Link href="/contact">Contact form</Link>
                        <Link href="/account/orders">View your orders</Link>
                    </div>
                </div>
            </main>
            <Footer />

            <style jsx global>{`
        .help {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.14);
          max-width: 680px;
          margin: 0 auto;
          padding: 140px 24px 100px;
          font-family: var(--aur-sans), system-ui, sans-serif;
          color: var(--ink);
        }
        .help__eyebrow {
          margin: 0;
          font-size: 0.72rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .help h1 {
          margin: 4px 0 12px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 2.4rem;
        }
        .help__sub {
          margin: 0 0 36px;
          font-size: 0.95rem;
          line-height: 1.6;
          color: rgba(24, 21, 19, 0.65);
        }
        .help__faqs {
          display: flex;
          flex-direction: column;
        }
        .help__item {
          border-bottom: 1px solid var(--line);
          padding: 18px 0;
        }
        .help__item summary {
          cursor: pointer;
          list-style: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.15rem;
          font-weight: 500;
        }
        .help__item summary::-webkit-details-marker {
          display: none;
        }
        .help__item summary::after {
          content: '+';
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 1.4rem;
          font-weight: 300;
          color: rgba(24, 21, 19, 0.45);
          transition: transform 0.3s ease;
        }
        .help__item[open] summary::after {
          transform: rotate(45deg);
        }
        .help__item p {
          margin: 12px 0 0;
          font-size: 0.92rem;
          line-height: 1.7;
          color: rgba(24, 21, 19, 0.68);
        }
        .help__contact {
          margin-top: 44px;
          padding-top: 30px;
          border-top: 1px solid var(--line);
        }
        .help__contact h2 {
          margin: 0 0 8px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.5rem;
        }
        .help__contact p {
          margin: 0 0 16px;
          font-size: 0.92rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .help__contactRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 24px;
        }
        .help__contactRow a {
          font-size: 0.92rem;
          color: var(--ink);
          text-decoration: underline;
          text-underline-offset: 3px;
      `}</style>
        </>
    );
}