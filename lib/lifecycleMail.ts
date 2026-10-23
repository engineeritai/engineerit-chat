import { createHmac, timingSafeEqual } from "node:crypto";
import { CONTACT_EMAIL } from "@/lib/trust";

/** First note about 21 days after sign-up, then every 30 days. */
export const LIFECYCLE_FIRST_AFTER_DAYS = 21;
export const LIFECYCLE_REPEAT_AFTER_DAYS = 30;
export const LIFECYCLE_BATCH_DEFAULT = 40;
export const LIFECYCLE_BATCH_MAX = 200;
/** A crashed send can be claimed again after this gap. */
export const LIFECYCLE_CLAIM_STALE_MS = 15 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export const LIFECYCLE_FROM_ADDRESS = CONTACT_EMAIL;
export const LIFECYCLE_FROM_NAME = "engineerit.ai";
export const LIFECYCLE_SIGNATURE = "The engineer it team";
export const LIFECYCLE_SUPPORT_LINE = "You can also reach us anytime at support@engineerit.ai.";
export const LIFECYCLE_PRICING_URL = "https://engineerit.ai/pricing";

export type LifecycleLocale = "en" | "ar" | null;

export type LifecycleCandidate = {
  id: string;
  email: string;
  createdAt: string;
  locale: LifecycleLocale;
  paid: boolean;
  optedOut: boolean;
  lastSentAt: string | null;
};

export function lifecycleEmailsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (env.LIFECYCLE_EMAILS || "").trim().toLowerCase() === "on";
}

export function lifecycleBatchLimit(raw = process.env.LIFECYCLE_EMAIL_BATCH) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return LIFECYCLE_BATCH_DEFAULT;
  return Math.min(LIFECYCLE_BATCH_MAX, Math.floor(value));
}

export function lifecycleCronAuthorized(
  authorization: string | null,
  alternate: string | null,
  secret: string | undefined
) {
  if (!secret) return false;
  return authorization === `Bearer ${secret}` || alternate === secret;
}

export function lifecycleDecision(
  user: Pick<LifecycleCandidate, "createdAt" | "lastSentAt">,
  now: Date
) {
  const created = Date.parse(user.createdAt);
  if (!Number.isFinite(created)) return null;
  if (!user.lastSentAt) {
    const dueAt = created + LIFECYCLE_FIRST_AFTER_DAYS * DAY_MS;
    return { due: now.getTime() >= dueAt, cycleKey: "first", dueAt };
  }
  const sent = Date.parse(user.lastSentAt);
  if (!Number.isFinite(sent)) return null;
  const dueAt = sent + LIFECYCLE_REPEAT_AFTER_DAYS * DAY_MS;
  return {
    due: now.getTime() >= dueAt,
    cycleKey: `m:${new Date(dueAt).toISOString().slice(0, 10)}`,
    dueAt,
  };
}

export function selectDueLifecycle(users: LifecycleCandidate[], now: Date, limit: number) {
  const due: Array<LifecycleCandidate & { cycleKey: string; dueAt: number }> = [];
  for (const user of users) {
    if (user.optedOut) continue;
    const decision = lifecycleDecision(user, now);
    if (!decision?.due) continue;
    due.push({ ...user, cycleKey: decision.cycleKey, dueAt: decision.dueAt });
  }
  due.sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));
  const cap = Math.max(0, Math.floor(limit));
  return due.slice(0, cap);
}

export type ClaimSnapshot = {
  status: "queued" | "sent" | "skipped";
  claimedAt: number | null;
};

/** Mirrors enqueue_lifecycle_feedback_emails: insert, skip, or retry a stale claim. */
export function claimOutcome(existing: ClaimSnapshot | null, nowMs: number): "insert" | "send" | "skip" {
  if (!existing) return "insert";
  if (existing.status !== "queued") return "skip";
  if (existing.claimedAt != null && nowMs - existing.claimedAt < LIFECYCLE_CLAIM_STALE_MS) return "skip";
  return "send";
}

export function lifecycleUnsubscribeToken(userId: string, secret: string) {
  const sig = createHmac("sha256", secret).update(userId).digest("base64url");
  return `${userId}.${sig}`;
}

export function lifecycleUserFromToken(token: string, secret: string) {
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;
  const userId = token.slice(0, splitAt);
  const sig = token.slice(splitAt + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;
  if (!secret || !sig) return null;
  const expected = createHmac("sha256", secret).update(userId).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return userId;
}

export type LifecycleMessage = {
  subject: string;
  text: string;
  html: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  kind: "feedback" | "feedback_subscribe";
  locale: "en" | "ar" | "both";
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraph(text: string) {
  return `<p>${escapeHtml(text)}</p>`;
}

const enPaid = {
  subject: "How is engineerit.ai working for you?",
  hello: "Hello,",
  thanks: "Thank you for using engineerit.ai. We would like your opinion of the platform.",
  ask: "What do you like in the chat, in the engineer tools, or in an AI Advisor if your plan includes one? What should we improve or add?",
  link: "Share your opinion",
  unsubscribe: "Unsubscribe from these emails",
};

const enFreeInvite = [
  "If you want to keep going with the engineer it community, the Engineer plan is SAR 19/month.",
  "It is not capped by the free Assistant Engineer plan's three replies a day, and it includes the drawing and design tools.",
  "Paid plans can also attach a drawing or a document.",
].join(" ");

const arPaid = {
  subject: "ما رأيك في engineerit.ai؟",
  hello: "مرحبا،",
  thanks: "شكرا لاستخدامك engineerit.ai. نود معرفة رأيك في المنصة.",
  ask: "ما الذي يعجبك في المحادثة أو في أدوات المهندس أو في مستشار ذكاء اصطناعي إذا كانت باقتك تشمله؟ وما الذي ينبغي أن نحسنه أو نضيفه؟",
  link: "شارك رأيك",
  unsubscribe: "إلغاء هذه الرسائل",
};

const arFreeInvite = [
  "إذا أردت المتابعة مع مجتمع engineer it، فباقة المهندس بـ SAR 19 في الشهر.",
  "باقة المهندس ليست مقيدة بثلاثة ردود في اليوم مثل باقة المهندس المساعد المجانية، وتشمل مراجعة الرسومات ومراجعة التصميم.",
  "الباقات المدفوعة يمكنها أيضا إرفاق رسم أو مستند.",
].join(" ");

function block(args: {
  dir: "ltr" | "rtl";
  hello: string;
  thanks: string;
  ask: string;
  invite: string | null;
  feedbackUrl: string;
  linkLabel: string;
  unsubscribeUrl: string;
  unsubscribeLabel: string;
  signature: string;
}) {
  const lines = [args.hello, "", args.thanks, "", args.ask, "", `${args.linkLabel}: ${args.feedbackUrl}`];
  if (args.invite) lines.push("", args.invite, LIFECYCLE_PRICING_URL);
  lines.push("", LIFECYCLE_SUPPORT_LINE, "", args.signature, "", `${args.unsubscribeLabel}: ${args.unsubscribeUrl}`);
  const html = [
    `<div dir="${args.dir}" lang="${args.dir === "rtl" ? "ar" : "en"}">`,
    paragraph(args.hello),
    paragraph(args.thanks),
    paragraph(args.ask),
    `<p><a href="${escapeHtml(args.feedbackUrl)}">${escapeHtml(args.linkLabel)}</a></p>`,
    args.invite ? paragraph(args.invite) : "",
    args.invite ? `<p><a href="${escapeHtml(LIFECYCLE_PRICING_URL)}">${escapeHtml(LIFECYCLE_PRICING_URL)}</a></p>` : "",
    paragraph(LIFECYCLE_SUPPORT_LINE),
    paragraph(args.signature),
    `<p><a href="${escapeHtml(args.unsubscribeUrl)}">${escapeHtml(args.unsubscribeLabel)}</a></p>`,
    "</div>",
  ].join("");
  return { text: lines.join("\n"), html };
}

export function buildLifecycleMessage(args: {
  locale: LifecycleLocale;
  paid: boolean;
  feedbackUrl: string;
  unsubscribeUrl: string;
}): LifecycleMessage {
  const inviteEn = args.paid ? null : enFreeInvite;
  const inviteAr = args.paid ? null : arFreeInvite;
  const english = block({
    dir: "ltr",
    hello: enPaid.hello,
    thanks: enPaid.thanks,
    ask: enPaid.ask,
    invite: inviteEn,
    feedbackUrl: args.feedbackUrl,
    linkLabel: enPaid.link,
    unsubscribeUrl: args.unsubscribeUrl,
    unsubscribeLabel: enPaid.unsubscribe,
    signature: LIFECYCLE_SIGNATURE,
  });
  const arabic = block({
    dir: "rtl",
    hello: arPaid.hello,
    thanks: arPaid.thanks,
    ask: arPaid.ask,
    invite: inviteAr,
    feedbackUrl: args.feedbackUrl,
    linkLabel: arPaid.link,
    unsubscribeUrl: args.unsubscribeUrl,
    unsubscribeLabel: arPaid.unsubscribe,
    signature: "فريق engineer it",
  });
  const locale = args.locale === "ar" ? "ar" : args.locale === "en" ? "en" : "both";
  const parts = locale === "ar" ? [arabic] : locale === "en" ? [english] : [english, arabic];
  return {
    subject: locale === "ar" ? arPaid.subject : enPaid.subject,
    text: parts.map((part) => part.text).join("\n\n"),
    html: parts.map((part) => part.html).join(""),
    fromAddress: LIFECYCLE_FROM_ADDRESS,
    fromName: LIFECYCLE_FROM_NAME,
    replyTo: LIFECYCLE_FROM_ADDRESS,
    kind: args.paid ? "feedback" : "feedback_subscribe",
    locale,
  };
}

export function unsubscribePage(state: "done" | "invalid" | "unconfigured") {
  const body =
    state === "done"
      ? `<p>You will not receive these feedback emails.</p>
<p dir="rtl" lang="ar">لن تصلك رسائل الرأي هذه بعد الآن.</p>
<p>${escapeHtml(LIFECYCLE_SUPPORT_LINE)}</p>`
      : state === "invalid"
        ? `<p>This unsubscribe link is not valid.</p>
<p dir="rtl" lang="ar">رابط إلغاء الرسائل غير صالح.</p>
<p>${escapeHtml(LIFECYCLE_SUPPORT_LINE)}</p>`
        : `<p>Unsubscribe is not available right now. Write to ${escapeHtml(LIFECYCLE_FROM_ADDRESS)}.</p>`;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>engineerit.ai</title></head>
<body style="font-family: sans-serif; line-height: 1.5; max-width: 36rem; margin: 2rem auto; padding: 0 1rem;">
${body}
</body>
</html>`;
}
