/**
 * Place at: frontend/src/app/terms/page.js   ·   Route: /terms
 * Terms of Service. The numbers (return window from the backend's GET /api/config, refund time from lib/policy.js); whose laws apply comes
 * from STORE.legal.jurisdiction in lib/store.js.
 */

import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { STORE } from '@/lib/store';
import { getPolicy } from '@/lib/getPolicy';

export const metadata = {
  alternates: { canonical: '/terms' },
  title: 'Terms of Service',
  description: 'The terms for browsing, ordering, cancelling and returning at Aurelia.',
};

const buildSections = (POLICY) => [
  {
    id: 'using',
    title: 'Using this website',
    content: (
      <p>
        By browsing the site or placing an order you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you do not agree,
        please do not use the site.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    content: (
      <>
        <p>You need an account to place an order. Please give us accurate details and keep your password to yourself. You are responsible for what happens under your account, so tell us straight away if you think someone else has used it.</p>
        <p>We may suspend an account that is used to abuse the site or other customers.</p>
      </>
    ),
  },
  {
    id: 'prices',
    title: 'Products and prices',
    content: (
      <>
        <p>Prices are in Pakistani rupees (Rs). We do our best to describe and photograph every piece accurately, but colours can look different on different screens.</p>
        <p>Prices and availability can change. The price you pay is the price shown when you place your order. If a price or the stock changed after you added an item to your bag, we update the bag and ask you to check the total before you order.</p>
        <p>If we notice a pricing mistake, we may cancel the affected order and tell you.</p>
      </>
    ),
  },
  {
    id: 'orders',
    title: 'Placing an order',
    content: (
      <>
        <p>Your order is placed when you press “Place order” and see the confirmation with your order number. The items are set aside for you at that moment.</p>
        <p>We may decline or cancel an order, for example if an item cannot be supplied, the address is outside our delivery area, or we suspect misuse. If that happens we will let you know.</p>
      </>
    ),
  },
  {
    id: 'payment',
    title: 'Payment',
    content: <p>You can pay the total shown at checkout (items plus shipping) in cash to the courier when your order arrives. Online payment through PayFast, JazzCash or Easypaisa is coming soon; once available, online payments are processed by the payment provider you choose on its own secure page; we never see or store your card or wallet details. An order paid online is only prepared for shipping once the provider confirms the payment, and an unpaid online order may be cancelled and its items released after a short time.</p>,
  },
  {
    id: 'cancel',
    title: 'Cancelling an order',
    content: (
      <p>
        You can cancel an order yourself from your <Link href="/account/orders">Orders</Link> page while it is pending or processing, and the items go
        back on sale. Once an order has shipped it can no longer be cancelled, but you may be able to return it after delivery (see below).
      </p>
    ),
  },
  {
    id: 'returns',
    title: 'Returns and refunds',
    content: (
      <>
        <p>
          You can return items within {POLICY.returnWindowDays} days of delivery if they are unworn, unwashed and still have their tags attached.
        </p>
        <p>
          To start a return, sign in, open your <Link href="/account/orders">Orders</Link> page and choose “Request return” on the delivered order. Pick
          the items and a reason. We review the request, and you can follow its progress on the same page.
        </p>
        <p>
          When we approve a return we will tell you how to send the items back. Once we have received and checked them, we process the refund within{' '}
          {POLICY.refundDays}. Because orders are paid in cash, we will agree with you how the money is sent to you (for example by bank transfer or
          mobile wallet). To exchange an item, email{' '}
          <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a> with your order number.
        </p>
        <p>Nothing in this section limits the rights you have under the law, for example if an item is faulty or not as described.</p>
      </>
    ),
  },
  {
    id: 'delivery',
    title: 'Delivery',
    content: (
      <p>
        Delivery areas, times and costs are set out in our <Link href="/shipping">Shipping Policy</Link>.
      </p>
    ),
  },
  {
    id: 'proper-use',
    title: 'Using the site properly',
    content: (
      <>
        <p>Please do not:</p>
        <ul>
          <li>try to break into the site, other accounts or the admin area;</li>
          <li>overload the site or use automated tools to send bulk requests or copy its content;</li>
          <li>use someone else’s details to order or to sign up;</li>
          <li>send us unlawful or abusive messages.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Our content',
    content: <p>The text, images, design and logo on this site belong to {STORE.name} or the people who license them to us. Please do not copy them for commercial use without our permission.</p>,
  },
  {
    id: 'liability',
    title: 'Our responsibility',
    content: (
      <>
        <p>We take care to run the store properly, but we cannot promise the site will always be available or free of errors.</p>
        <p>To the extent the law allows, we are not responsible for indirect losses, and our responsibility for any order is limited to the amount you paid for it. Nothing in these terms limits anything that cannot be limited by law, or your rights as a consumer.</p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    content: <p>These terms are governed by the laws of {STORE.legal.jurisdiction}, and the courts of {STORE.legal.jurisdiction} can hear any dispute about them.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    content: <p>We may update these terms. The version on this page when you place an order is the one that applies to that order.</p>,
  },
];

export default async function TermsPage() {
  const sections = buildSections(await getPolicy());
  return (
    <LegalPage
      current="terms"
      title="Terms of Service"
      intro="The rules for using the website and for ordering, cancelling and returning, written to be easy to read."
      sections={sections}
    />
  );
}
