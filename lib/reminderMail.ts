import { createHmac, timingSafeEqual } from "node:crypto";
import { isTestRecipient } from "@/lib/mailPolicy";
import { CONTACT_EMAIL } from "@/lib/trust";

/** Pending rows older than this are expired and never sent. */
export const REMINDER_STALE_DAYS = 7;
export const REMINDER_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const REMINDER_CLAIM_STALE_MS = 15 * 60 * 1000;
export const REMINDER_BATCH_DEFAULT = 40;
export const REMINDER_BATCH_MAX = 200;
export const REMINDER_EXPIRING_DAYS = 3;

export const REMINDER_KINDS = ["assistant_weekly_upsell", "sub_expired_weekly", "sub_expiring_3d"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const REMINDER_FROM_ADDRESS = CONTACT_EMAIL;
export const REMINDER_FROM_NAME = "engineerit.ai";

const PRIORITY: Record<ReminderKind, number> = {
  sub_expiring_3d: 3,
  sub_expired_weekly: 2,
  assistant_weekly_upsell: 1,
};

export type ReminderRow = {
  id: string;
  userId: string;
  email: string;
  kind: ReminderKind;
  createdAt: string;
  sentAt: string | null;
  claimedAt: string | null;
  locale: "en" | "ar" | null;
};

export type ReminderPlan = {
  expire: string[];
  skip: { id: string; reason: string }[];
  send: ReminderRow[];
};

export function reminderEmailsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (env.REMINDER_EMAILS || "").trim().toLowerCase() === "on";
}

export function reminderEnqueueEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (env.REMINDER_ENQUEUE || "").trim().toLowerCase() === "on";
}

export function reminderBatchLimit(raw = process.env.REMINDER_EMAIL_BATCH) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return REMINDER_BATCH_DEFAULT;
  return Math.min(REMINDER_BATCH_MAX, Math.floor(value));
}

export function reminderCronAuthorized(
  authorization: string | null,
  alternate: string | null,
  secret: string | undefined
) {
  if (!secret) return false;
  return authorization === `Bearer ${secret}` || alternate === secret;
}

export function isReminderKind(value: unknown): value is ReminderKind {
  return typeof value === "string" && (REMINDER_KINDS as readonly string[]).includes(value);
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Missing timestamps are treated as already stale so an unknown row cannot be mailed. */
export function normalizeReminderRow(row: Record<string, unknown>): {
  id: string;
  userId: string;
  email: string;
  kind: string;
  createdAt: string | null;
  sentAt: string | null;
  claimedAt: string | null;
  locale: "en" | "ar" | null;
  status: string;
} | null {
  const id = asText(row.id);
  if (!id) return null;
  const kind = asText(row.kind || row.type || row.template || row.notification_type);
  const created = asText(row.created_at || row.queued_at || row.inserted_at);
  const localeRaw = asText(row.locale).toLowerCase();
  const locale = localeRaw === "ar" || localeRaw.startsWith("ar-") ? "ar" : localeRaw === "en" || localeRaw.startsWith("en-") ? "en" : null;
  return {
    id,
    userId: asText(row.user_id || row.user),
    email: asText(row.email || row.to_email || row.recipient).toLowerCase(),
    kind,
    createdAt: created || null,
    sentAt: asText(row.sent_at) || null,
    claimedAt: asText(row.claimed_at) || null,
    locale,
    status: asText(row.status).toLowerCase() || "pending",
  };
}

export function weekKey(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() - weekday + 1);
  return day.toISOString().slice(0, 10);
}

export function planReminderQueue(args: {
  rows: ReminderRow[];
  now: Date;
  optedOut: ReadonlySet<string>;
  recentlySent: ReadonlySet<string>;
  limit: number;
}): ReminderPlan {
  const expire: string[] = [];
  const skip: { id: string; reason: string }[] = [];
  const fresh: ReminderRow[] = [];
  const staleBefore = args.now.getTime() - REMINDER_STALE_DAYS * 24 * 60 * 60 * 1000;

  for (const row of args.rows) {
    const created = Date.parse(row.createdAt);
    if (!Number.isFinite(created) || created < staleBefore) {
      expire.push(row.id);
      continue;
    }
    if (!row.userId) {
      skip.push({ id: row.id, reason: "no-user" });
      continue;
    }
    if (!row.email || !row.email.includes("@")) {
      skip.push({ id: row.id, reason: "no-email" });
      continue;
    }
    if (isTestRecipient(row.email)) {
      skip.push({ id: row.id, reason: "test-recipient" });
      continue;
    }
    if (args.optedOut.has(row.userId)) {
      skip.push({ id: row.id, reason: "unsubscribed" });
      continue;
    }
    if (row.claimedAt) {
      const claimed = Date.parse(row.claimedAt);
      if (Number.isFinite(claimed) && args.now.getTime() - claimed < REMINDER_CLAIM_STALE_MS) {
        skip.push({ id: row.id, reason: "claimed" });
        continue;
      }
    }
    if (args.recentlySent.has(row.userId)) {
      skip.push({ id: row.id, reason: "weekly-cap" });
      continue;
    }
    fresh.push(row);
  }

  fresh.sort(
    (a, b) =>
      PRIORITY[b.kind] - PRIORITY[a.kind] ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id)
  );

  const send: ReminderRow[] = [];
  const chosen = new Set<string>();
  const cap = Math.max(0, Math.floor(args.limit));
  for (const row of fresh) {
    if (chosen.has(row.userId)) {
      skip.push({ id: row.id, reason: "weekly-cap" });
      continue;
    }
    if (send.length >= cap) continue;
    chosen.add(row.userId);
    send.push(row);
  }
  return { expire, skip, send };
}

export type EnqueueInput = {
  id: string;
  email: string | null;
  tier?: string | null;
  /** False when the address has not been confirmed. Missing means unconfirmed. */
  confirmed?: boolean;
};

export type EnqueueSubscription = {
  userId: string;
  email: string | null;
  status: string;
  periodEnd: string;
  locale: "en" | "ar" | null;
  confirmed?: boolean;
};

export function isConfirmedAccount(emailConfirmedAt: string | null | undefined) {
  return Boolean(emailConfirmedAt && emailConfirmedAt.trim());
}

export type NewReminder = {
  userId: string;
  email: string;
  kind: ReminderKind;
  locale: "en" | "ar" | null;
  dedupeKey: string;
};

/**
 * Only conditions that are true inside the current window. A subscription that
 * ended in March is not enqueued in November.
 */
export function planReminderEnqueue(args: {
  now: Date;
  profiles: EnqueueInput[];
  subscriptions: EnqueueSubscription[];
  existingKeys: ReadonlySet<string>;
  optedOut: ReadonlySet<string>;
}): NewReminder[] {
  const now = args.now.getTime();
  const week = weekKey(args.now);
  const planned: NewReminder[] = [];
  const seen = new Set<string>();
  const open = new Set<string>();

  const claimedUsers = new Set<string>();

  function push(row: NewReminder) {
    if (claimedUsers.has(row.userId)) return;
    if (seen.has(row.dedupeKey) || args.existingKeys.has(row.dedupeKey)) return;
    if (args.optedOut.has(row.userId)) return;
    if (!row.email || !row.email.includes("@") || isTestRecipient(row.email)) return;
    seen.add(row.dedupeKey);
    claimedUsers.add(row.userId);
    planned.push(row);
  }

  for (const sub of args.subscriptions) {
    if (!sub.confirmed) continue;
    const end = Date.parse(sub.periodEnd);
    if (!Number.isFinite(end)) continue;
    const status = sub.status.trim().toLowerCase();
    const email = (sub.email || "").trim().toLowerCase();
    if (status === "active" || status === "past_due") {
      open.add(sub.userId);
      const until = now + REMINDER_EXPIRING_DAYS * 24 * 60 * 60 * 1000;
      if (end > now && end <= until) {
        push({
          userId: sub.userId,
          email,
          kind: "sub_expiring_3d",
          locale: sub.locale,
          dedupeKey: `expiring:${sub.userId}:${week}`,
        });
      }
    }
    if (status === "expired" || status === "canceled" || status === "cancelled") {
      if (end <= now && now - end <= REMINDER_WEEK_MS) {
        push({
          userId: sub.userId,
          email,
          kind: "sub_expired_weekly",
          locale: sub.locale,
          dedupeKey: `expired:${sub.userId}:${week}`,
        });
      }
    }
  }

  for (const profile of args.profiles) {
    if (!profile.confirmed) continue;
    const tier = (profile.tier || "assistant").trim().toLowerCase();
    if (tier && tier !== "assistant") continue;
    if (open.has(profile.id)) continue;
    push({
      userId: profile.id,
      email: (profile.email || "").trim().toLowerCase(),
      kind: "assistant_weekly_upsell",
      locale: null,
      dedupeKey: `upsell:${profile.id}:${week}`,
    });
  }
  return planned;
}

export function reminderUnsubscribeToken(userId: string, secret: string) {
  const sig = createHmac("sha256", secret).update(`reminder:${userId}`).digest("base64url");
  return `${userId}.${sig}`;
}

export function reminderUserFromToken(token: string, secret: string) {
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;
  const userId = token.slice(0, splitAt);
  const sig = token.slice(splitAt + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;
  if (!secret || !sig) return null;
  const expected = createHmac("sha256", secret).update(`reminder:${userId}`).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return userId;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const COPY: Record<ReminderKind, { en: { subject: string; body: string }; ar: { subject: string; body: string } }> = {
  assistant_weekly_upsell: {
    en: {
      subject: "The Engineer plan on engineerit.ai",
      body: "The free Assistant Engineer plan includes a few chats a day. The Engineer plan is SAR 19 a month and adds the drawing and design tools.",
    },
    ar: {
      subject: "باقة المهندس في engineerit.ai",
      body: "باقة المهندس المساعد المجانية تشمل عددا قليلا من المحادثات في اليوم. باقة المهندس بـ 19 ر.س شهريا وتضيف أدوات الرسومات ومراجعة التصميم.",
    },
  },
  sub_expiring_3d: {
    en: {
      subject: "Your engineerit.ai plan ends soon",
      body: "Your paid plan ends within 3 days. You can review it from the billing page.",
    },
    ar: {
      subject: "باقتك في engineerit.ai تنتهي قريبا",
      body: "تنتهي باقتك المدفوعة خلال 3 أيام. يمكنك مراجعتها من صفحة الفوترة.",
    },
  },
  sub_expired_weekly: {
    en: {
      subject: "Your engineerit.ai plan has ended",
      body: "Your paid plan has ended and the account is on the free Assistant Engineer plan. You can buy a plan again from the pricing page.",
    },
    ar: {
      subject: "انتهت باقتك في engineerit.ai",
      body: "انتهت باقتك المدفوعة والحساب الآن على باقة المهندس المساعد المجانية. يمكنك شراء باقة من جديد من صفحة الأسعار.",
    },
  },
};

export function buildReminderMessage(args: {
  kind: ReminderKind;
  locale: "en" | "ar" | null;
  pricingUrl: string;
  billingUrl: string;
  unsubscribeUrl: string;
}) {
  const copy = COPY[args.kind];
  const actionUrl = args.kind === "sub_expiring_3d" ? args.billingUrl : args.pricingUrl;
  const locales = args.locale === "ar" ? (["ar"] as const) : args.locale === "en" ? (["en"] as const) : (["en", "ar"] as const);
  const blocks = locales.map((locale) => {
    const part = copy[locale];
    const unsub = locale === "ar" ? "إلغاء هذه الرسائل" : "Unsubscribe from these emails";
    const text = [part.body, "", actionUrl, "", `${unsub}: ${args.unsubscribeUrl}`].join("\n");
    const html = `<div dir="${locale === "ar" ? "rtl" : "ltr"}" lang="${locale}"><p>${escapeHtml(part.body)}</p><p><a href="${escapeHtml(actionUrl)}">${escapeHtml(actionUrl)}</a></p><p><a href="${escapeHtml(args.unsubscribeUrl)}">${escapeHtml(unsub)}</a></p></div>`;
    return { subject: part.subject, text, html };
  });
  return {
    subject: blocks[0].subject,
    text: blocks.map((block) => block.text).join("\n\n"),
    html: blocks.map((block) => block.html).join(""),
    fromAddress: REMINDER_FROM_ADDRESS,
    fromName: REMINDER_FROM_NAME,
    replyTo: REMINDER_FROM_ADDRESS,
  };
}

export function reminderUnsubscribePage(state: "done" | "invalid" | "unconfigured") {
  const body =
    state === "done"
      ? `<p>You will not receive these reminder emails.</p><p dir="rtl" lang="ar">لن تصلك رسائل التذكير هذه بعد الآن.</p>`
      : state === "invalid"
        ? `<p>This unsubscribe link is not valid.</p><p dir="rtl" lang="ar">رابط إلغاء الرسائل غير صالح.</p>`
        : `<p>Unsubscribe is not available right now. Write to ${escapeHtml(REMINDER_FROM_ADDRESS)}.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>engineerit.ai</title></head><body style="font-family: sans-serif; line-height: 1.5; max-width: 36rem; margin: 2rem auto; padding: 0 1rem;">${body}</body></html>`;
}

export function countByKind(rows: { kind: ReminderKind }[]) {
  const counts: Record<ReminderKind, number> = {
    assistant_weekly_upsell: 0,
    sub_expired_weekly: 0,
    sub_expiring_3d: 0,
  };
  for (const row of rows) counts[row.kind] += 1;
  return counts;
}
