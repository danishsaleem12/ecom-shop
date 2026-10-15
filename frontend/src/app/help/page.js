'use client';

/**
 * Place at: frontend/src/app/help/page.js
 */

import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { STORE } from '@/lib/store';
import { pkr } from '@/lib/policy';
import { usePolicy } from '@/context/PolicyContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import './help.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

// Every answer below matches what the store really does today.
// Shipping cost and the return window come from the backend (GET /api/config); delivery times from lib/policy.js.
// Full wording of each policy lives on /shipping, /terms and /privacy.
const buildFaqs = (POLICY) => [
    {
        q: 'How long does delivery take?',
        a: `Orders within the city typically arrive in ${POLICY.deliveryCity}. Nationwide delivery usually takes ${POLICY.deliveryNationwide} from the day your order is placed.`,
    },
    {
        q: 'How do I pay?',
        a: 'You can pay the courier in cash when your order arrives (cash on delivery). Online payment by card or mobile wallet (PayFast, JazzCash and Easypaisa) is coming soon.',
    },
    {
        q: 'Do I need an account to place an order?',
        a: 'Yes. Please sign in or create a free account at checkout. It lets you track and cancel your orders any time from your Orders page.',
    },
    {
        q: 'How can I track my order?',
        a: 'Signed in? Open your Orders page to see the live status. You can also use the Track order page with your order number and the email you entered at checkout.',
    },
    {
        q: 'Can I change or cancel my order after placing it?',
        a: 'You can cancel it yourself until it ships: sign in, open Orders and choose Cancel on that order. Once an order has shipped it can no longer be cancelled. To change the address or items on an order, contact us as soon as possible and we will do our best to help.',
    },
    {
        q: 'Do you offer free shipping?',
        a: `Yes \u2014 orders of ${pkr(POLICY.freeShippingThreshold)} or more ship free. Orders below that have a flat shipping fee of ${pkr(POLICY.shippingFee)}, added at checkout.`,
    },
    {
        q: 'What is your returns policy?',
        a: `We accept returns within ${POLICY.returnWindowDays} days of delivery for unworn, unwashed items with tags still attached. Once we receive your return, refunds are processed within ${POLICY.refundDays}.`,
    },
    {
        q: 'How do I return or exchange an item?',
        a: `Sign in, open your Orders page and choose Request return on the delivered order (available for ${POLICY.returnWindowDays} days after delivery). Pick the items and a reason, and we will review it; you can follow its progress on the same page. To exchange an item, email us at ${STORE.supportEmail} with your order number.`,
    },
];

export default function HelpPage() {
    const { count: cartCount } = useCart();
    const { count: wishlistCount } = useWishlist();
    const FAQS = buildFaqs(usePolicy());

    return (
        <>
            <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
            <main className={`${serif.variable} ${sans.variable} help`}>
                <p className="help__eyebrow">Support</p>
                <h1>Help &amp; returns</h1>
                <p className="help__sub">
                    Answers to the questions we hear most. See also the <Link href="/faq">full FAQ</Link>, the <Link href="/size-guide">size guide</Link> and
                    the <Link href="/care">care guide</Link>. Can&apos;t find what you need? Reach out below.
                </p>

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
                        <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a>
                        <Link href="/contact">Contact form</Link>
                        <Link href="/account/orders">View your orders</Link>
                        <Link href="/track-order">Track an order</Link>
                        <Link href="/shipping">Shipping policy</Link>
                        <Link href="/terms">Terms of service</Link>
                        <Link href="/privacy">Privacy policy</Link>
                    </div>
                </div>
            </main>
            <Footer />

        </>
    );
}