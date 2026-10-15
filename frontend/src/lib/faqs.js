// src/lib/faqs.js
// The questions on the FAQ page (/faq), in groups. Every answer matches what the store really does today.
// Shipping cost, the free-shipping threshold and the return window come from the backend (see lib/getPolicy.js);
// delivery and refund times from lib/policy.js. The full wording of each policy lives on /shipping and /terms.
//
// An answer is plain text (also used for Google's FAQ rich results). `link` adds one link under the answer.
import { STORE } from '@/lib/store';
import { pkr } from '@/lib/policy';

export const buildFaqGroups = (POLICY) => [
  {
    id: 'orders',
    title: 'Orders and payment',
    items: [
      {
        q: 'How do I pay?',
        a: 'You can pay the courier in cash when your order arrives (cash on delivery). Online payment by card or mobile wallet (PayFast, JazzCash and Easypaisa) is coming soon.',
      },
      {
        q: 'Do I need an account to place an order?',
        a: 'Yes. Please sign in or create a free account at checkout. It lets you track and cancel your orders any time from your Orders page.',
      },
      {
        q: 'Can I use a promo code?',
        a: 'Yes. Type your code in the order summary at checkout and apply it. The discount is shown before you place your order, and if a code cannot be used, the reason appears next to it.',
      },
      {
        q: 'Can I change or cancel my order after placing it?',
        a: 'You can cancel it yourself until it ships: sign in, open Orders and choose Cancel on that order. Once an order has shipped it can no longer be cancelled. To change the address or items on an order, contact us as soon as possible and we will do our best to help.',
        link: { href: '/account/orders', label: 'Go to your orders' },
      },
      {
        q: 'Is my bag saved if I sign in on another device?',
        a: 'Yes. When you are signed in, your bag is saved to your account and follows you to your other devices. Your wishlist stays in the browser you saved it in.',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Shipping and delivery',
    items: [
      {
        q: 'How long does delivery take?',
        a: `Orders within ${POLICY.homeCity} typically arrive in ${POLICY.deliveryCity}. Nationwide delivery usually takes ${POLICY.deliveryNationwide} from the day your order is placed. These are estimates, not guarantees.`,
      },
      {
        q: 'Do you offer free shipping?',
        a: `Yes. Orders of ${pkr(POLICY.freeShippingThreshold)} or more ship free. Orders below that have a flat shipping fee of ${pkr(POLICY.shippingFee)}, shown at checkout before you place your order.`,
      },
      {
        q: 'Do you deliver outside Pakistan?',
        a: 'Not at the moment. We currently deliver within Pakistan only.',
      },
      {
        q: 'How can I track my order?',
        a: 'Signed in? Open your Orders page to see the live status and, once it has shipped, the tracking number. You can also use Track an order with your order number and the email on the order, without signing in.',
        link: { href: '/track-order', label: 'Track an order' },
      },
      {
        q: 'What if my item arrives damaged or is not what I ordered?',
        a: `Please check your parcel when it arrives and contact us as soon as you can at ${STORE.supportEmail}. You can also request a return within ${POLICY.returnWindowDays} days of delivery.`,
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns and refunds',
    items: [
      {
        q: 'What is your returns policy?',
        a: `We accept returns within ${POLICY.returnWindowDays} days of delivery for unworn, unwashed items with tags still attached. Once we receive your return, refunds are processed within ${POLICY.refundDays}.`,
        link: { href: '/terms#returns', label: 'Read returns and refunds in full' },
      },
      {
        q: 'How do I return or exchange an item?',
        a: `Sign in, open your Orders page and choose Request return on the delivered order (available for ${POLICY.returnWindowDays} days after delivery). Pick the items and a reason, and we will review it; you can follow its progress on the same page. To exchange an item, email us at ${STORE.supportEmail} with your order number.`,
      },
    ],
  },
  {
    id: 'sizing-care',
    title: 'Sizing and care',
    items: [
      {
        q: 'How do I find my size?',
        a: 'Measure your bust, waist and hips and compare them with our size chart. If you are between two sizes, the guide explains how to choose.',
        link: { href: '/size-guide', label: 'Open the size guide' },
      },
      {
        q: 'How should I wash and look after my pieces?',
        a: 'Always follow the care label sewn into the garment. Our care guide has general advice for linen, cotton, knitwear, silk and other fabrics.',
        link: { href: '/care', label: 'Open the care guide' },
      },
    ],
  },
  {
    id: 'account',
    title: 'Your account',
    items: [
      {
        q: 'I forgot my password.',
        a: 'Use Forgot password on the sign-in page. We email you a link to choose a new one; the link works once and expires after a short time.',
        link: { href: '/forgot-password', label: 'Reset your password' },
      },
      {
        q: 'Why was I asked to confirm my email?',
        a: 'After you sign up we email you a confirmation link, so we know the address is yours and can reach you about your orders. If you did not get it, ask for a new one from your Account page.',
        link: { href: '/account', label: 'Go to your account' },
      },
      {
        q: 'Can I download my data or delete my account?',
        a: 'Yes, both. Open your Account page and find Your data. Deleting removes your account, addresses, reviews and newsletter subscription. Past orders are kept without your name, address or contact details, because we need them for our accounting records.',
        link: { href: '/account', label: 'Go to your account' },
      },
    ],
  },
];

// Flat list, for the FAQ structured data
export const flattenFaqs = (groups) => groups.flatMap((g) => g.items);
