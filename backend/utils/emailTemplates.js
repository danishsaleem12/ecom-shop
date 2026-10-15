// backend/utils/emailTemplates.js — the wording and layout of every email the store sends.
// Each function returns { subject, text, html }. Everything a customer typed (names, addresses,
// messages) goes through esc() before it is placed in the HTML.
const { RETURN_WINDOW_DAYS, RETURN_REASONS } = require("./returns");
const { unsubscribeUrl } = require("./unsubscribe");
const { isOnline, gatewayName, payNote: payNoteFor } = require("./paymentMethods");

const STORE = "Aurelia";

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
const site = () => (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
// Same rule as frontend/src/lib/orderRef.js
const orderRef = (o) => o?.orderNumber || String(o?._id || "").slice(-8).toUpperCase();

// Paid online (PayFast, JazzCash, Easypaisa) or on delivery? Used in the order emails below.
const isCard = (o) => isOnline(o?.paymentMethod);
const payNote = (o) => payNoteFor(o?.paymentMethod);

function layout({ heading, bodyHtml, footerHtml = "" }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6efe8;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:Helvetica,Arial,sans-serif;color:#181513;line-height:1.55;">
  <p style="margin:0 0 6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8a7f76;">${STORE}</p>
  <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-weight:400;font-size:26px;">${esc(heading)}</h1>
  ${bodyHtml}
  <p style="margin:32px 0 0;font-size:12px;color:#8a7f76;">${footerHtml || `${STORE}`}</p>
</div></body></html>`;
}

const p = (html) => `<p style="margin:0 0 14px;font-size:15px;">${html}</p>`;
const button = (url, label) =>
  `<p style="margin:22px 0;"><a href="${esc(url)}" style="display:inline-block;background:#181513;color:#f6efe8;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:14px;">${esc(label)}</a></p>`;

// "M / Black" for items bought with a size and/or color
const optionLabel = (i) => [i.size, i.color].filter(Boolean).join(" / ");

function itemsTable(items = []) {
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #e4dbd1;font-size:14px;">${esc(i.name)}${optionLabel(i) ? ` <span style="color:#8a7f76;">(${esc(optionLabel(i))})</span>` : ""} <span style="color:#8a7f76;">× ${esc(i.qty)}</span></td>
      <td style="padding:8px 0;border-bottom:1px solid #e4dbd1;font-size:14px;text-align:right;white-space:nowrap;">${money(i.price * i.qty)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 14px;">${rows}</table>`;
}
const itemsText = (items = []) => items.map((i) => `  - ${i.name}${optionLabel(i) ? ` (${optionLabel(i)})` : ""} x ${i.qty}   ${money(i.price * i.qty)}`).join("\n");

// "Discount (SUMMER10): -Rs 500" — only when the order used a promo code
const discountText = (order) => (order.discount > 0 ? `  Discount${order.promo?.code ? ` (${order.promo.code})` : ""}: -${money(order.discount)}` : "");
const discountHtml = (order) =>
  order.discount > 0
    ? p(`<span style="color:#8a7f76;">Discount${order.promo?.code ? ` (${esc(order.promo.code)})` : ""}: -${money(order.discount)}</span>`)
    : "";

function addressLines(a = {}) {
  return [a.fullName, a.line1, a.line2, [a.city, a.postalCode].filter(Boolean).join(" "), a.country, a.phone].filter(Boolean);
}

// ---- customer emails ----------------------------------------------------------------------------

function orderConfirmation(order) {
  const ref = orderRef(order);
  const lines = addressLines(order.shippingAddress);
  const track = `${site()}/track-order`;
  const subject = `Your ${STORE} order ${ref}`;
  const text = [
    `Thank you for your order, ${order.shippingAddress?.fullName || ""}`.trim() + ".",
    ``,
    `Order number: ${ref}`,
    itemsText(order.items),
    ...(order.discount > 0 ? [discountText(order)] : []),
    `Total: ${money(order.total)} (${payNote(order)})`,
    ``,
    `Delivering to:`,
    ...lines.map((l) => `  ${l}`),
    ``,
    `Track your order any time with your order number and this email address: ${track}`,
  ].join("\n");
  const html = layout({
    heading: "Thank you for your order",
    bodyHtml:
      p(`Your order number is <strong>${esc(ref)}</strong>. We will email you again when it ships.`) +
      itemsTable(order.items) +
      discountHtml(order) +
      p(`<strong>Total: ${money(order.total)}</strong><br><span style="color:#8a7f76;">${isCard(order) ? `Paid online${order.paymentMethod === "card" ? " by card" : ` with ${gatewayName(order.paymentMethod)}`}. Thank you.` : "Cash on delivery: pay when it arrives."}</span>`) +
      p(`<strong>Delivering to</strong><br>${lines.map(esc).join("<br>")}`) +
      button(track, "Track your order") +
      p(`<span style="color:#8a7f76;font-size:13px;">Use your order number and this email address to look it up.</span>`),
  });
  return { subject, text, html };
}

const STATUS_COPY = {
  shipped: { heading: "Your order is on its way", line: "Your order has been shipped and is on its way to you." },
  delivered: {
    heading: "Your order has been delivered",
    line: `Your order has been delivered. We hope you love it. If something is not right, you can request a return within ${RETURN_WINDOW_DAYS} days from your account.`,
  },
  cancelled: {
    heading: "Your order has been cancelled",
    line: "Your order has been cancelled and the items are back in stock. Nothing has been charged.",
  },
};

/** Emails exist for these order statuses only; processing is internal and stays quiet. */
const ORDER_STATUS_EMAILS = Object.keys(STATUS_COPY);

function orderStatus(order, status = order.status) {
  let copy = STATUS_COPY[status];
  if (!copy) return null;
  // A card order that was already paid is refunded by the store, so "nothing has been charged" would be wrong
  if (status === "cancelled" && isCard(order) && order.paymentStatus === "paid") {
    copy = { ...copy, line: `Your order has been cancelled and the items are back in stock. We will refund your ${order.paymentMethod === "card" ? "card" : gatewayName(order.paymentMethod)} payment, which can take a few business days to appear.` };
  }
  const ref = orderRef(order);
  const link = `${site()}/account/orders`;
  // Tracking details are only mentioned in the "shipped" email, and only if the admin entered them
  const showTracking = status === "shipped" && order.trackingNumber;
  const trackingText = showTracking ? `Tracking number: ${order.trackingNumber}${order.courier ? ` (${order.courier})` : ""}` : "";
  const trackingHtml = showTracking
    ? p(`Tracking number: <strong>${esc(order.trackingNumber)}</strong>${order.courier ? ` (${esc(order.courier)})` : ""}`)
    : "";
  return {
    subject: `${copy.heading} (${ref})`,
    text: `${copy.line}\n\nOrder number: ${ref}${trackingText ? `\n${trackingText}` : ""}\nYour orders: ${link}`,
    html: layout({
      heading: copy.heading,
      bodyHtml: p(esc(copy.line)) + p(`Order number: <strong>${esc(ref)}</strong>`) + trackingHtml + button(link, "View your orders"),
    }),
  };
}

const RETURN_COPY = {
  requested: ["We received your return request", "We have received your return request and will review it shortly."],
  approved: ["Your return was approved", `Your return has been approved. Please see our Help page for how to send the items back: ${site()}/help`],
  rejected: ["Your return was declined", "We are sorry, but we could not approve this return."],
  received: ["We received your return", "We have received the items you sent back and are processing them."],
  refunded: ["Your refund has been issued", "Your refund has been issued. It can take a few business days to appear."],
};

function returnUpdate(order) {
  const rr = order.returnRequest || {};
  const copy = RETURN_COPY[rr.status];
  if (!copy) return null;
  const [heading, line] = copy;
  const ref = orderRef(order);
  const note = rr.adminNote ? `Note from us: ${rr.adminNote}` : "";
  const link = `${site()}/account/orders`;
  return {
    subject: `${heading} (${ref})`,
    text: [line, note, `Order number: ${ref}`, `Your orders: ${link}`].filter(Boolean).join("\n\n"),
    html: layout({
      heading,
      bodyHtml:
        p(esc(line)) +
        (note ? p(`<em>${esc(note)}</em>`) : "") +
        p(`Order number: <strong>${esc(ref)}</strong>`) +
        button(link, "View your orders"),
    }),
  };
}

function subscribeWelcome(email) {
  const unsub = unsubscribeUrl(email);
  return {
    subject: `Welcome to ${STORE}`,
    text: `Thank you for subscribing. We will write to you about new arrivals and collections, and never too often.\n\nUnsubscribe any time: ${unsub}`,
    html: layout({
      heading: "Welcome to Aurelia",
      bodyHtml: p("Thank you for subscribing. We will write to you about new arrivals and collections, and never too often.") + button(site(), "Visit the shop"),
      footerHtml: `You are receiving this because you subscribed on our website. <a href="${esc(unsub)}" style="color:#8a7f76;">Unsubscribe</a>`,
    }),
  };
}

// A newsletter written in the admin: plain text where a blank line starts a new paragraph, plus an optional button.
// Everything is escaped, so the admin can't accidentally (or a hijacked admin account can't deliberately) inject HTML.
const safeLink = (u) => (/^https?:\/\/\S+$/i.test(String(u || "").trim()) ? String(u).trim() : "");

function newsletter(email, { subject, body, buttonLabel, buttonUrl }) {
  const unsub = unsubscribeUrl(email);
  const paragraphs = String(body || "").split(/\r?\n\s*\r?\n/).map((t) => t.trim()).filter(Boolean);
  const link = safeLink(buttonUrl);
  const hasButton = Boolean(link && buttonLabel);
  return {
    subject,
    headers: { "List-Unsubscribe": `<${unsub}>` },
    text: `${paragraphs.join("\n\n")}${hasButton ? `\n\n${buttonLabel}: ${link}` : ""}\n\n--\nUnsubscribe any time: ${unsub}`,
    html: layout({
      heading: subject,
      bodyHtml: paragraphs.map((t) => p(esc(t).replace(/\r?\n/g, "<br>"))).join("") + (hasButton ? button(link, buttonLabel) : ""),
      footerHtml: `You are receiving this because you subscribed on our website. <a href="${esc(unsub)}" style="color:#8a7f76;">Unsubscribe</a>`,
    }),
  };
}

function passwordReset(user, url, minutes) {
  return {
    subject: `Reset your ${STORE} password`,
    text: `Hello ${user.name || ""},\n\nUse this link to choose a new password (valid for ${minutes} minutes):\n${url}\n\nIf you did not ask for this, you can ignore this email: your password stays the same.`,
    html: layout({
      heading: "Reset your password",
      bodyHtml:
        p(`Hello ${esc(user.name || "")}, use the button below to choose a new password. The link works for ${minutes} minutes and only once.`) +
        button(url, "Choose a new password") +
        p(`<span style="color:#8a7f76;font-size:13px;">If you did not ask for this, ignore this email. Your password stays the same.</span>`),
    }),
  };
}

function emailVerification(user, url, hours) {
  return {
    subject: `Confirm your email for ${STORE}`,
    text: `Hello ${user.name || ""},\n\nWelcome to ${STORE}. Please confirm your email address (the link works for ${hours} hours):\n${url}\n\nYou need to confirm it before you can place an order. If you did not create an account, you can ignore this email.`,
    html: layout({
      heading: "Confirm your email",
      bodyHtml:
        p(`Hello ${esc(user.name || "")}, welcome to ${STORE}. Please confirm your email address with the button below. The link works for ${hours} hours.`) +
        button(url, "Confirm my email") +
        p(`<span style="color:#8a7f76;font-size:13px;">You need to confirm it before you can place an order. If you did not create an account, ignore this email.</span>`),
    }),
  };
}

function passwordChanged(user) {
  return {
    subject: `Your ${STORE} password was changed`,
    text: `Hello ${user.name || ""},\n\nThe password on your account was just changed, and any other devices were signed out.\n\nIf this was not you, reset your password straight away: ${site()}/forgot-password`,
    html: layout({
      heading: "Your password was changed",
      bodyHtml:
        p(`Hello ${esc(user.name || "")}, the password on your account was just changed and other devices were signed out.`) +
        p("If this was not you, reset your password straight away.") +
        button(`${site()}/forgot-password`, "Reset password"),
    }),
  };
}

function accountDeleted(user) {
  return {
    subject: `Your ${STORE} account was deleted`,
    text: `Hello ${user.name || ""},\n\nYour account and personal data have been deleted, as you asked. Past orders are kept without your name, address or contact details, because we need them for our accounting records.\n\nIf this was not you, please contact us at once: ${site()}/contact`,
    html: layout({
      heading: "Your account was deleted",
      bodyHtml:
        p(`Hello ${esc(user.name || "")}, your account and personal data have been deleted, as you asked.`) +
        p("Past orders are kept without your name, address or contact details, because we need them for our accounting records.") +
        p("If this was not you, please contact us at once.") +
        button(`${site()}/contact`, "Contact us"),
    }),
  };
}

// ---- emails to the store owner --------------------------------------------------------------------

function adminNewOrder(order) {
  const ref = orderRef(order);
  const a = order.shippingAddress || {};
  const lines = addressLines(a);
  return {
    subject: `New order ${ref}: ${money(order.total)}`,
    text: [`New order ${ref}`, itemsText(order.items), ...(order.discount > 0 ? [discountText(order)] : []), `Total: ${money(order.total)} (${payNote(order)})`, ``, ...lines, a.email ? `Email: ${a.email}` : "", order.notes ? `Notes: ${order.notes}` : ""]
      .filter((l) => l !== "")
      .join("\n"),
    html: layout({
      heading: `New order ${ref}`,
      bodyHtml:
        itemsTable(order.items) +
        discountHtml(order) +
        p(`<strong>Total: ${money(order.total)}</strong> (${payNote(order)})`) +
        p(lines.map(esc).join("<br>") + (a.email ? `<br>${esc(a.email)}` : "")) +
        (order.notes ? p(`<em>Notes: ${esc(order.notes)}</em>`) : "") +
        button(`${site()}/admin/orders`, "Open orders"),
    }),
  };
}

/** The store must act on a payment: refund a payment that arrived for a cancelled order, a cancelled paid order, or a double payment. */
function adminPaymentAlert(order, kind, transactionId = "") {
  const ref = orderRef(order);
  const copy = {
    cancelledPaid: {
      subject: `Refund needed: paid order ${ref} was cancelled`,
      line: `Order ${ref} was cancelled after the customer had paid ${money(order.total)} online. Please refund it in your ${gatewayName(order.paymentMethod)} merchant dashboard.`,
    },
    paidAfterCancel: {
      subject: `Refund needed: payment arrived for cancelled order ${ref}`,
      line: `A payment of ${money(order.total)} arrived for order ${ref}, which had already been cancelled (for example because the payment window ran out). The items were put back in stock, so please refund the payment in your ${gatewayName(order.paymentMethod)} merchant dashboard.`,
    },
    duplicate: {
      subject: `Double payment on order ${ref}`,
      line: `Order ${ref} was paid twice${transactionId ? ` (second ${gatewayName(order.paymentMethod)} transaction: ${transactionId})` : ""}. Please refund one of the payments in your ${gatewayName(order.paymentMethod)} merchant dashboard.`,
    },
  }[kind];
  return {
    subject: copy.subject,
    text: `${copy.line}\n\nOrder: ${site()}/admin/orders`,
    html: layout({
      heading: copy.subject,
      bodyHtml: p(esc(copy.line)) + (order.payment?.transactionId ? p(`${esc(gatewayName(order.paymentMethod))} transaction: <strong>${esc(order.payment.transactionId)}</strong>`) : "") + button(`${site()}/admin/orders`, "Open orders"),
    }),
  };
}

function adminNewReturn(order) {
  const rr = order.returnRequest || {};
  const ref = orderRef(order);
  const reason = RETURN_REASONS[rr.reason] || rr.reason || "";
  const items = (rr.items || []).map((i) => `${i.name} × ${i.qty}`);
  return {
    subject: `Return requested for order ${ref}`,
    text: [`Return requested for order ${ref}`, `Reason: ${reason}`, rr.details ? `Details: ${rr.details}` : "", `Items:`, ...items.map((i) => `  - ${i}`)].filter(Boolean).join("\n"),
    html: layout({
      heading: `Return requested: ${ref}`,
      bodyHtml:
        p(`Reason: <strong>${esc(reason)}</strong>`) +
        (rr.details ? p(`<em>${esc(rr.details)}</em>`) : "") +
        p(items.map(esc).join("<br>")) +
        button(`${site()}/admin/returns`, "Open returns"),
    }),
  };
}

function adminNewContact(msg) {
  return {
    subject: `Contact form: ${msg.subject}`,
    text: `From: ${msg.name} <${msg.email}>\nSubject: ${msg.subject}\n\n${msg.message}`,
    html: layout({
      heading: "New contact message",
      bodyHtml:
        p(`<strong>${esc(msg.name)}</strong> &lt;${esc(msg.email)}&gt;<br>Subject: ${esc(msg.subject)}`) +
        `<p style="margin:0 0 14px;font-size:15px;white-space:pre-wrap;">${esc(msg.message)}</p>` +
        button(`${site()}/admin/messages`, "Open messages"),
    }),
  };
}

module.exports = {
  orderConfirmation,
  orderStatus,
  ORDER_STATUS_EMAILS,
  returnUpdate,
  subscribeWelcome,
  newsletter,
  safeLink,
  passwordReset,
  emailVerification,
  passwordChanged,
  accountDeleted,
  adminNewOrder,
  adminPaymentAlert,
  adminNewReturn,
  adminNewContact,
  esc,
};
