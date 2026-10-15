// backend/routes/newsletters.routes.js — send a newsletter to everyone on the subscriber list (admin only)
//   GET  /api/newsletters         history, newest first (?page=&limit=); poll it to follow a send in progress
//   POST /api/newsletters/test    { subject, body, buttonLabel?, buttonUrl? }  -> sends ONE copy to the admin's own email
//   POST /api/newsletters         same body -> starts sending to every subscriber; answers 202 straight away
//                                 and keeps going in the background (progress shows in the history)
const express = require("express");
const router = express.Router();
const Newsletter = require("../models/Newsletter");
const Subscriber = require("../models/Subscriber");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { parsePaging, pageInfo } = require("../utils/pagination");
const mailer = require("../utils/mailer");
const tpl = require("../utils/emailTemplates");

router.use(protect, adminOnly);

const STALE_MS = 2 * 60 * 60 * 1000; // a "sending" record older than this is treated as dead (server restarted mid-send)
const BATCH = 10; // emails sent at once
const delay = () => (process.env.NEWSLETTER_DELAY_MS !== undefined ? Number(process.env.NEWSLETTER_DELAY_MS) || 0 : 200); // pause between batches, so SMTP limits aren't hit

// Reads and checks the newsletter fields. Returns { data } or { error }.
function readNewsletter(body = {}) {
  const text = (v) => (typeof v === "string" ? v.trim() : "");
  const subject = text(body.subject).replace(/\s+/g, " ");
  const content = text(body.body);
  const buttonLabel = text(body.buttonLabel);
  const buttonUrl = text(body.buttonUrl);

  if (!subject) return { error: "Write a subject." };
  if (subject.length > 150) return { error: "The subject can be at most 150 characters." };
  if (!content) return { error: "Write the message." };
  if (content.length > 10000) return { error: "The message can be at most 10,000 characters." };
  if (buttonLabel || buttonUrl) {
    if (!buttonLabel || !buttonUrl) return { error: "A button needs both a label and a link (or leave both empty)." };
    if (buttonLabel.length > 40) return { error: "The button label can be at most 40 characters." };
    if (!tpl.safeLink(buttonUrl) || buttonUrl.length > 500) return { error: "The button link must start with http:// or https://" };
  }
  return { data: { subject, body: content, ...(buttonLabel ? { buttonLabel, buttonUrl } : {}) } };
}

// Production without SMTP would "send" nothing and count every subscriber as failed: say so before starting
const mailReady = () => mailer.isConfigured() || process.env.NODE_ENV !== "production";
const NOT_READY = { message: "Email is not set up on the server (SMTP_HOST and MAIL_FROM), so newsletters can't be sent." };

router.get("/", async (req, res) => {
  try {
    const paging = parsePaging(req.query, { defaultLimit: 10, maxLimit: 50 });
    const [total, newsletters] = await Promise.all([
      Newsletter.countDocuments({}),
      Newsletter.find({}).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    ]);
    res.json({ newsletters, ...pageInfo(total, paging) });
  } catch (err) {
    handleRouteError(res, err, "Failed to load newsletters");
  }
});

router.post("/test", async (req, res) => {
  try {
    const { data, error } = readNewsletter(req.body);
    if (error) return res.status(400).json({ message: error });
    if (!mailReady()) return res.status(503).json(NOT_READY);
    const to = req.user.email;
    const ok = await mailer.sendMail({ to, ...tpl.newsletter(to, data) });
    if (!ok) return res.status(502).json({ message: "The test email could not be sent. Check the mail settings on the server." });
    res.json({ message: `Test sent to ${to}`, to });
  } catch (err) {
    handleRouteError(res, err, "Failed to send the test email");
  }
});

router.post("/", async (req, res) => {
  try {
    const { data, error } = readNewsletter(req.body);
    if (error) return res.status(400).json({ message: error });
    if (!mailReady()) return res.status(503).json(NOT_READY);

    // One send at a time: a double click (or a second admin) must not email everyone twice
    if (await Newsletter.exists({ status: "sending", createdAt: { $gt: new Date(Date.now() - STALE_MS) } })) {
      return res.status(409).json({ message: "A newsletter is still being sent. Wait for it to finish." });
    }

    const subscribers = await Subscriber.find({}, "email").lean();
    if (subscribers.length === 0) return res.status(400).json({ message: "There are no subscribers to send to yet." });

    const newsletter = await Newsletter.create({ ...data, recipients: subscribers.length, createdBy: req.user._id });
    mailer.track(deliverAll(newsletter, subscribers.map((s) => s.email)));
    res.status(202).json({ newsletter });
  } catch (err) {
    handleRouteError(res, err, "Failed to start sending");
  }
});

// Sends in small batches and records progress. Never throws: a failure is counted and the send carries on.
async function deliverAll(newsletter, emails) {
  let sent = 0;
  let failed = 0;
  try {
    for (let i = 0; i < emails.length; i += BATCH) {
      const results = await Promise.all(
        emails.slice(i, i + BATCH).map((to) => mailer.sendMail({ to, ...tpl.newsletter(to, newsletter) }).catch(() => false))
      );
      sent += results.filter(Boolean).length;
      failed += results.filter((r) => !r).length;
      await Newsletter.updateOne({ _id: newsletter._id }, { $set: { sent, failed } });
      if (delay() && i + BATCH < emails.length) await new Promise((r) => setTimeout(r, delay()));
    }
  } catch (err) {
    console.error("Newsletter send stopped early:", err?.message);
    failed = emails.length - sent; // whatever was not sent is counted as failed
  }
  try {
    await Newsletter.updateOne({ _id: newsletter._id }, { $set: { sent, failed, status: sent === 0 ? "failed" : "sent", finishedAt: new Date() } });
  } catch (err) {
    console.error("Could not save the newsletter result:", err?.message);
  }
}

module.exports = router;
