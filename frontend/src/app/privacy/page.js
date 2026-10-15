/**
 * Place at: frontend/src/app/privacy/page.js   ·   Route: /privacy
 * Plain-language privacy policy. It describes what the store does today (see the notes in each section);
 * update it, and STORE.legal.lastUpdated in lib/store.js, if you add analytics, new emails, new providers, etc.
 */

import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import CookieSettings from '@/components/CookieSettings';
import { GA_ID } from '@/lib/analytics';
import { STORE } from '@/lib/store';

export const metadata = {
  alternates: { canonical: '/privacy' },
  title: 'Privacy Policy',
  description: 'What personal information Aurelia collects, why, who sees it, and the choices you have.',
};

const sections = [
  {
    id: 'who',
    title: 'Who we are',
    content: (
      <>
        <p>
          {STORE.name} is an online clothing store serving customers in Pakistan. This policy explains what personal information we collect when you use
          this website, why we collect it, and what we do with it.
        </p>
        <p>
          If you have a question about it, write to <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect',
    content: (
      <>
        <ul>
          <li>
            <strong>Your account:</strong> your name, email address and password. Passwords are stored in scrambled (hashed) form, so we cannot read them.
          </li>
          <li>
            <strong>Your orders:</strong> the name, phone number, optional email, delivery address, city, postal code and delivery notes you enter at
            checkout, plus the items you ordered, the total and the order’s status.
          </li>
          <li>
            <strong>Online payments:</strong> if you pay by card or mobile wallet, the payment is taken on the website of the provider you choose (PayFast, JazzCash or
            Easypaisa). We never see or store your card or wallet details. We keep only whether the payment succeeded, failed or was refunded, and the
            provider’s reference for it.
          </li>
          <li>
            <strong>Returns:</strong> the items, the reason and any details you give when you ask to return an order, and our reply.
          </li>
          <li>
            <strong>Messages:</strong> your name, email, subject and message when you use the contact form.
          </li>
          <li>
            <strong>Newsletter:</strong> your email address when you subscribe.
          </li>
          <li>
            <strong>Order tracking:</strong> the order number and email you type on the Track order page are used only to find your order. We do not
            keep a record of the lookup.
          </li>
          <li>
            <strong>Technical data:</strong> your IP address is used briefly to limit repeated sign-in, sign-up and form attempts, so the site cannot be
            abused.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    content: (
      <>
        <ul>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To process, deliver and track your orders, handle cancellations and returns, and contact you about them, usually by phone or email.</li>
          <li>
            To send you service emails about your account and orders: order confirmations, shipping, delivery and cancellation updates, return updates,
            password reset links and a notice when your password is changed. These are not marketing.
          </li>
          <li>To reply to the messages you send us. Contact-form messages and new-order and return alerts are also emailed to our store inbox.</li>
          <li>To send you our newsletter, but only if you subscribed. Every newsletter email has an unsubscribe link.</li>
          <li>To keep the website secure and prevent misuse.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    content: (
      <>
        <ul>
          <li>
            <strong>Sign-in cookie.</strong> When you sign in or create an account we set a cookie called <code>aurelia_token</code>. It keeps you signed
            in, cannot be read by scripts on the page, expires after 30 days and is removed when you sign out.
          </li>
          <li>
            <strong>Saved in your browser.</strong> Your bag (<code>aurelia-cart</code>), wishlist (<code>aurelia-wishlist</code>) and recent searches (
            <code>aurelia-recent-searches</code>) are remembered in your browser’s local storage, and closing the announcement bar and having seen the opening animation are remembered for the visit (in session storage). You can clear all of this at any time in your browser settings.
          </li>
          {GA_ID ? (
            <li>
              <strong>Analytics (only if you accept).</strong> We use Google Analytics to count visits and see which pages and products are popular, and to
              count completed orders. If you accept, Google sets cookies (<code>_ga</code> and <code>_ga_…</code>, kept for up to about 2 years) and receives your
              pages viewed, device and browser information, approximate location and your IP address. If you decline, none of this is loaded. We do not use
              advertising cookies. Your choice is remembered in your browser (<code>aurelia-consent</code>) and you can change it at any time:
              <br />
              <CookieSettings />
            </li>
          ) : (
            <li>We do not currently use advertising or analytics cookies.</li>
          )}
          <li>
            <strong>Images from other services.</strong> Some images on the website are loaded from other services (for example Cloudinary, which hosts our product photos). Your browser
            contacts them directly to fetch those images, so they can see your IP address.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'share',
    title: 'Who we share it with',
    content: (
      <>
        <ul>
          <li>
            <strong>Delivery couriers</strong> receive your name, phone number and address so they can deliver your order.
          </li>
          <li>
            <strong>Service providers</strong> that host the website and its database, deliver our emails and host our product photos. They process
            information only to run the store. Some of them are based or store data outside Pakistan, so your information may be handled in other
            countries.
          </li>
          <li>
            <strong>Authorities</strong>, if the law requires us to share information.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    content: (
      <>
        <p>We keep information only for as long as we need it for the purposes above:</p>
        <ul>
          <li>Account details until you ask us to delete your account.</li>
          <li>Order and return records for as long as we need them to handle returns, settle disputes and meet our accounting and legal obligations.</li>
          <li>Contact messages until your question is dealt with, and for a reasonable time afterwards.</li>
          <li>Your newsletter address until you unsubscribe, after which it is deleted from our list.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'choices',
    title: 'Your choices',
    content: (
      <>
        <ul>
          <li>
            Change your name or password at any time on your <Link href="/account">Account</Link> page.
          </li>
          <li>
            Unsubscribe from the newsletter at any time with the link at the bottom of any newsletter email, or by writing to us. Unsubscribing removes
            your address from the list.
          </li>
          <li>
            Ask us for a copy of your personal information, to correct it, or to delete it by writing to{' '}
            <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a>. Some order records may need to be kept for legal or accounting reasons.
          </li>
          <li>Clear the information saved in your browser whenever you like.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Keeping it safe',
    content: (
      <p>
        We protect the website with hashed passwords, a protected sign-in cookie and limits on repeated attempts. No online service is completely secure,
        so please choose a strong password that you do not use anywhere else.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    content: (
      <p>
        The store is meant for adults. We do not knowingly collect personal information from children. If you think a child has given us theirs, tell us
        and we will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    content: <p>If we change this policy we will post the new version on this page and update the date at the top.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      current="privacy"
      title="Privacy Policy"
      intro="We keep this simple: we only collect what we need to run the store, and we tell you what that is."
      sections={sections}
    />
  );
}
