// backend/routes/payments.routes.js — payment notifications and return addresses, mounted at /api/payments.
//
//   (all)       GET      /methods            which online methods are switched on (public, booleans only)
//   PayFast     POST|GET /payfast/ipn        webhook called by PayFast's servers (validation_hash checked)
//   JazzCash    POST     /jazzcash/return    the customer's browser comes back from JazzCash (pp_SecureHash checked)
//               POST|GET /jazzcash/ipn       optional server-to-server notification (same check)
//   Easypaisa   GET|POST /easypaisa/return   the customer's browser comes back from Easypay
//               GET|POST /easypaisa/ipn      optional server-to-server notification
//               (Easypaisa requests are never trusted: we ask Easypay's server directly whether the order was paid.)
//
// These are the ONLY places that mark an online order paid or failed. Every gateway goes through
// utils/paymentResult.js, so the same rules apply to all of them:
//   - the result must be proven genuine (signature, or a direct inquiry to the gateway);
//   - the amount the gateway says it took must match the order total;
//   - receiving the same result twice is safe: a paid order stays paid, nothing is sent twice.
// The browser being sent back to the shop proves nothing; the order page reads the real status from the backend.
const express = require("express");
const router = express.Router();
const payfast = require("../utils/payfast");
const jazzcash = require("../utils/jazzcash");
const easypaisa = require("../utils/easypaisa");
const { applyPaymentResult } = require("../utils/paymentResult");
const { availableMethods } = require("../utils/paymentMethods");
const { handleRouteError } = require("../utils/errors");

// Gateways may send the result as a form POST or as query parameters, so both are read
router.use(express.urlencoded({ extended: false }));

const paramsOf = (req) => ({ ...(req.query || {}), ...(req.body && typeof req.body === "object" ? req.body : {}) });
const frontendUrl = () => jazzcash.config().frontendUrl; // same FRONTEND_URL for every gateway

/** Where the customer lands after paying: the order page, which shows the real status (and "Pay now" after a failure). */
const orderPage = (order, failed) => `${frontendUrl()}/order-success/${order._id}${failed ? "?payment=failed" : ""}`;

// GET /api/payments/methods — public. Which online methods are switched on (keys present), e.g.
// { card: false, jazzcash: false, easypaisa: false }. The checkout shows the others as "Coming soon". Booleans only, no secrets.
router.get("/methods", (req, res) => {
  res.set("Cache-Control", "public, max-age=30");
  res.json({ methods: availableMethods() });
});

// ---------------------------------------------------------------- PayFast

async function payfastIpn(req, res) {
  try {
    const result = payfast.verifyCallback(paramsOf(req));
    if (!result.ok) return res.status(400).json({ message: "Invalid payment notification" });

    const r = await applyPaymentResult({
      method: "card",
      orderNumber: payfast.orderNumberFromBasket(result.basketId),
      paid: result.paid,
      amount: result.amount,
      transactionId: result.transactionId,
      message: result.message,
      label: "PayFast",
    });
    if (r.code !== 200) return res.status(r.code).json({ message: r.message });
    res.status(200).send("OK");
  } catch (err) {
    handleRouteError(res, err, "Failed to process the payment notification");
  }
}

router.post("/payfast/ipn", payfastIpn);
router.get("/payfast/ipn", payfastIpn);

// ---------------------------------------------------------------- JazzCash

/** Handles a JazzCash result. `browser` = the customer's browser (answer with a redirect), otherwise the IPN (answer 200). */
function jazzcashHandler({ browser }) {
  return async (req, res) => {
    try {
      const result = jazzcash.verifyResponse(paramsOf(req));
      if (!result.ok) {
        return res.status(400).type("text").send("Invalid payment notification");
      }

      // "Pending" (the wallet approval hasn't happened yet) is not a failure: leave the order as it is
      const r = result.pending
        ? await applyPaymentResult({ method: "jazzcash", orderNumber: result.orderNumber, lookupOnly: true })
        : await applyPaymentResult({
            method: "jazzcash",
            orderNumber: result.orderNumber,
            paid: result.paid,
            amount: result.amount,
            transactionId: result.transactionId,
            message: result.message,
            label: "JazzCash",
          });

      if (browser) {
        if (r.order) return res.redirect(303, orderPage(r.order, !result.paid && !result.pending));
        // Unknown order / amount mismatch: nothing was changed. Send the customer somewhere safe that shows the true state.
        return res.redirect(303, `${frontendUrl()}/account/orders`);
      }
      if (r.code !== 200) return res.status(r.code).json({ message: r.message });
      res.status(200).send("OK");
    } catch (err) {
      handleRouteError(res, err, "Failed to process the payment notification");
    }
  };
}

router.post("/jazzcash/return", jazzcashHandler({ browser: true }));
router.post("/jazzcash/ipn", jazzcashHandler({ browser: false }));
router.get("/jazzcash/ipn", jazzcashHandler({ browser: false }));

// ---------------------------------------------------------------- Easypaisa

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const origin = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

/** A tiny page that posts the auth_token on to Easypay's confirm address (a browser must do it: it is a form POST). */
function sendConfirmPage(res, form) {
  const c = easypaisa.config();
  // helmet's default policy forbids inline scripts and posting to another site: allow exactly this one form on this one page
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'unsafe-inline'; form-action ${origin(form.url)} ${origin(c.backendUrl)} ${origin(c.frontendUrl)}`
  );
  const inputs = Object.entries(form.fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join("");
  res
    .status(200)
    .type("html")
    .send(
      `<!doctype html><html><head><meta charset="utf-8"><title>Confirming payment…</title></head><body>` +
        `<p style="font-family:sans-serif">Confirming your payment…</p>` +
        `<form id="f" method="POST" action="${esc(form.url)}">${inputs}<noscript><button type="submit">Continue</button></noscript></form>` +
        `<script>document.getElementById("f").submit();</script></body></html>`
    );
}

/** Asks Easypay's own server about the order in `params` and applies the answer. Resolves to { order?, state } or null if unknown. */
async function settleEasypaisa(params) {
  const ref = easypaisa.refFromParams(params);
  const orderNumber = easypaisa.orderNumberFromRef(ref);
  if (!orderNumber) return null;

  let answer;
  try {
    answer = await easypaisa.inquire(ref);
  } catch (err) {
    // Easypay can't be reached right now: change nothing (a failed lookup is never a failed payment). The customer's
    // order page keeps checking for a while.
    console.error("Easypaisa: inquiry failed:", err?.message);
    const r = await applyPaymentResult({ method: "easypaisa", orderNumber, lookupOnly: true });
    return r.order ? { order: r.order, state: "unknown" } : null;
  }

  if (answer.state === "pending") {
    const r = await applyPaymentResult({ method: "easypaisa", orderNumber, lookupOnly: true });
    return r.order ? { order: r.order, state: "pending" } : null;
  }

  const r = await applyPaymentResult({
    method: "easypaisa",
    orderNumber,
    paid: answer.state === "paid",
    amount: answer.amount,
    transactionId: answer.transactionId,
    message: answer.message,
    label: "Easypaisa",
  });
  return r.order ? { order: r.order, state: answer.state, code: r.code } : { state: answer.state, code: r.code, message: r.message };
}

function easypaisaHandler({ browser }) {
  return async (req, res) => {
    try {
      const params = paramsOf(req);

      // Easypay brought the customer back with a token: finish the payment first, it comes back here once more afterwards
      if (browser && params.auth_token) {
        const form = easypaisa.confirmForm(params);
        if (form) return sendConfirmPage(res, form);
      }

      const r = await settleEasypaisa(params);
      if (browser) {
        if (r?.order) return res.redirect(303, orderPage(r.order, r.state === "failed"));
        return res.redirect(303, `${frontendUrl()}/account/orders`);
      }
      if (!r) return res.status(404).json({ message: "Order not found" });
      if (r.code && r.code !== 200) return res.status(r.code).json({ message: r.message });
      res.status(200).send("OK");
    } catch (err) {
      handleRouteError(res, err, "Failed to process the payment notification");
    }
  };
}

router.get("/easypaisa/return", easypaisaHandler({ browser: true }));
router.post("/easypaisa/return", easypaisaHandler({ browser: true }));
router.get("/easypaisa/ipn", easypaisaHandler({ browser: false }));
router.post("/easypaisa/ipn", easypaisaHandler({ browser: false }));

module.exports = router;
