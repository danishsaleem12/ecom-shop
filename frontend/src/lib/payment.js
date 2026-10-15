// src/lib/payment.js
// Online payment (PayFast, JazzCash, Easypaisa) helpers shared by checkout, the thank-you page, the account orders page and the admin.
//
// How the flow works:
//   1. Checkout sends POST /api/orders with paymentMethod "card" (PayFast), "jazzcash" or "easypaisa". The backend saves
//      the order (paymentStatus "unpaid") and answers { order, payment }, where `payment` is what the browser must send
//      to the gateway:
//        { gateway: 'payfast' | 'jazzcash' | 'easypaisa', url: 'https://...', method: 'POST', fields: { ... } }
//   2. The browser submits those fields to the gateway as a normal form POST (submitPayment below). The customer pays
//      on the gateway's own page, so card numbers and wallet PINs never touch this site.
//   3. The gateway sends the customer back (through the backend) to /order-success/<id>. Only the backend marks an
//      order paid, after verifying the gateway's message, so the thank-you page never trusts the address it was
//      opened from: it reads order.paymentStatus from the backend (and waits for it to change if it is a bit late).
//   4. If the customer closes the gateway tab or the payment fails, the order stays "unpaid"/"failed" and they can
//      pay again with POST /api/orders/:id/pay, which answers { payment } like step 1.

export const ONLINE_METHODS = ['card', 'jazzcash', 'easypaisa'];
export const PAYMENT_METHODS = ['cod', ...ONLINE_METHODS];

// What the customer sees for each online method
export const METHOD_INFO = {
  card: { gateway: 'PayFast', short: 'Card', label: 'Card (PayFast)' },
  jazzcash: { gateway: 'JazzCash', short: 'JazzCash', label: 'JazzCash' },
  easypaisa: { gateway: 'Easypaisa', short: 'Easypaisa', label: 'Easypaisa' },
};

/** The gateway's name for a method or an order ("PayFast", "JazzCash", "Easypaisa"); "the payment provider" if unknown. */
export const gatewayName = (methodOrOrder) => {
  const m = typeof methodOrOrder === 'string' ? methodOrOrder : methodOrOrder?.paymentMethod;
  return METHOD_INFO[m]?.gateway || 'the payment provider';
};

/** "Paid by card through PayFast" / "Paid with JazzCash" / "Paid with Easypaisa". */
export const paidVia = (methodOrOrder) => {
  const m = typeof methodOrOrder === 'string' ? methodOrOrder : methodOrOrder?.paymentMethod;
  return m === 'card' ? 'by card through PayFast' : `with ${gatewayName(m)}`;
};

// paymentStatus values the backend sends
export const PAYMENT_STATUS_LABEL = {
  unpaid: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

/** True for an order the customer is paying online (not cash on delivery). */
export const isOnlinePayment = (order) => ONLINE_METHODS.includes(order?.paymentMethod);

/** True while an online order has not been confirmed by the gateway yet (or the last attempt failed). */
export const needsPayment = (order) =>
  isOnlinePayment(order) && order.status !== 'cancelled' && ['unpaid', 'failed'].includes(order.paymentStatus || 'unpaid');

/** Short label for where the money comes from, e.g. "Cash on delivery" / "Card (PayFast)" / "JazzCash". */
export const methodLabel = (order) => (isOnlinePayment(order) ? METHOD_INFO[order.paymentMethod].label : 'Cash on delivery');

/**
 * One-line payment summary for lists and documents.
 * Cash on delivery has no online status, so it only says how it is paid.
 */
export const paymentSummary = (order) => {
  if (!isOnlinePayment(order)) return 'Cash on delivery';
  return `${METHOD_INFO[order.paymentMethod].short} · ${PAYMENT_STATUS_LABEL[order.paymentStatus || 'unpaid'] || order.paymentStatus}`;
};

/** The tone of the status badge: "ok", "warn" or "bad". Used for the CSS modifier. */
export const paymentTone = (order) => {
  const s = order?.paymentStatus;
  if (s === 'paid') return 'ok';
  if (s === 'failed') return 'bad';
  return 'warn';
};

/**
 * Checks the `payment` object the backend sent before the browser posts anything to it.
 * Returns the object when it is usable, otherwise null. Only https addresses are accepted (http://localhost is
 * allowed too, so a gateway sandbox can be tried on a local machine).
 */
export const validPayment = (payment) => {
  if (!payment || typeof payment !== 'object') return null;
  if (!payment.fields || typeof payment.fields !== 'object' || Array.isArray(payment.fields)) return null;
  let url;
  try {
    url = new URL(payment.url);
  } catch {
    return null;
  }
  const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) return null;
  return payment;
};

/**
 * Sends the customer to the payment gateway: builds a hidden form with the fields from the backend and submits it.
 * Returns false (and does nothing) when `payment` is not usable. Browser only.
 */
export function submitPayment(payment, doc = typeof document !== 'undefined' ? document : null) {
  const ok = validPayment(payment);
  if (!ok || !doc) return false;
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = ok.url;
  form.style.display = 'none';
  for (const [name, value] of Object.entries(ok.fields)) {
    if (value === undefined || value === null) continue;
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }
  doc.body.appendChild(form);
  form.submit();
  return true;
}

/**
 * Asks the backend for a fresh payment form for an order that is not paid yet.
 * Resolves to { ok, payment, message }.
 */
export async function requestPayment(apiUrl, orderId) {
  try {
    const res = await fetch(`${apiUrl}/api/orders/${encodeURIComponent(orderId)}/pay`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, payment: null, message: data.message || 'We could not start the payment. Please try again.' };
    const payment = validPayment(data.payment);
    if (!payment) return { ok: false, payment: null, message: 'The payment page is not available right now. Please try again in a moment.' };
    return { ok: true, payment, message: '' };
  } catch {
    return { ok: false, payment: null, message: 'We could not reach the server. Please check your connection and try again.' };
  }
}

// How the thank-you page waits for the webhook: ask every few seconds, give up after about a minute.
export const PAYMENT_POLL_MS = 3000;
export const PAYMENT_POLL_MAX = 20;
