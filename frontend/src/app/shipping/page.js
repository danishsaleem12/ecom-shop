/**
 * Place at: frontend/src/app/shipping/page.js   ·   Route: /shipping
 * Shipping policy. Shipping cost, free-shipping threshold and return window come live from the backend (GET /api/config);
 * delivery times come from lib/policy.js.
 */

import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { pkr } from '@/lib/policy';
import { getPolicy } from '@/lib/getPolicy';

export const metadata = {
  alternates: { canonical: '/shipping' },
  title: 'Shipping Policy',
  description: 'Where Aurelia delivers, how long it takes, what it costs and how to track your order.',
};

const buildSections = (POLICY) => [
  {
    id: 'where',
    title: 'Where we deliver',
    content: <p>We currently deliver within Pakistan only.</p>,
  },
  {
    id: 'times',
    title: 'Delivery times',
    content: (
      <>
        <ul>
          <li>Within {POLICY.homeCity}: usually {POLICY.deliveryCity}.</li>
          <li>Nationwide: usually {POLICY.deliveryNationwide}.</li>
        </ul>
        <p>These times count from the day your order is placed. They are estimates, not guarantees, and can be longer in busy periods or because of courier delays.</p>
      </>
    ),
  },
  {
    id: 'cost',
    title: 'Shipping cost',
    content: (
      <p>
        Orders of {pkr(POLICY.freeShippingThreshold)} or more ship free. Orders below that have a flat shipping fee of {pkr(POLICY.shippingFee)}. The shipping
        cost is shown at checkout, before you place your order.
      </p>
    ),
  },
  {
    id: 'payment',
    title: 'Paying on delivery',
    content: <p>Orders are paid in cash to the courier when they arrive (cash on delivery), so please make sure someone is available to receive it. Online payment by card or mobile wallet (PayFast, JazzCash and Easypaisa) is coming soon; orders paid online will be shipped once the payment is confirmed.</p>,
  },
  {
    id: 'status',
    title: 'Order status and tracking',
    content: (
      <>
        <p>After you order, your order moves through these stages: pending, processing, shipped and delivered. An order that is cancelled shows as cancelled.</p>
        <p>We email you when your order ships, when it is delivered and if it is cancelled, to the email you gave at checkout or, if you left that blank, the email of your account.</p>
        <p>
          Signed in? Open your <Link href="/account/orders">Orders</Link> page. You can also use <Link href="/track-order">Track an order</Link> with your
          order number and the email on the order (the one you entered at checkout, or your account email); you do not need to be signed in for that.
        </p>
      </>
    ),
  },
  {
    id: 'address',
    title: 'Your delivery address and phone number',
    content: (
      <>
        <p>We deliver to the address you enter at checkout, so please check it carefully, and make sure the phone number you give can be reached by the courier.</p>
        <p>To change the address or items on an order, contact us as soon as possible, before the order ships, and we will do our best to help.</p>
      </>
    ),
  },
  {
    id: 'problems',
    title: 'Damaged or wrong items',
    content: (
      <p>
        Please check your parcel when it arrives. If something is damaged, faulty or not what you ordered, contact us as soon as you can. You can also
        request a return within {POLICY.returnWindowDays} days of delivery; see <Link href="/terms#returns">Returns and refunds</Link>.
      </p>
    ),
  },
  {
    id: 'cancel',
    title: 'Cancelling before it ships',
    content: (
      <p>
        You can cancel an order yourself from your <Link href="/account/orders">Orders</Link> page until it has shipped. After that it cannot be cancelled.
      </p>
    ),
  },
];

export default async function ShippingPage() {
  const sections = buildSections(await getPolicy());
  return (
    <LegalPage
      current="shipping"
      title="Shipping Policy"
      intro="Where we deliver, how long it takes, what it costs and how to follow your order."
      sections={sections}
    />
  );
}
