import type { OutboundMail } from "@/lib/mail";
import {
  buildReminderMessage,
  countByKind,
  planReminderEnqueue,
  planReminderQueue,
  reminderUnsubscribeToken,
  type EnqueueInput,
  type EnqueueSubscription,
  type NewReminder,
  type ReminderKind,
  type ReminderRow,
} from "@/lib/reminderMail";

export type ReminderStore = {
  expire(id: string, now: Date): Promise<void>;
  skip(id: string, reason: string, now: Date): Promise<void>;
  claim(id: string, now: Date): Promise<boolean>;
  markSent(id: string, now: Date): Promise<void>;
  release(id: string): Promise<void>;
  insert(row: NewReminder, now: Date): Promise<ReminderRow | null>;
};

export type ReminderRunResult = {
  enabled: boolean;
  dryRun: boolean;
  enqueue: boolean;
  stale: number;
  skipped: number;
  failed: number;
  sent: number;
  wouldSend: Record<ReminderKind, number>;
  wouldEnqueue: Record<ReminderKind, number>;
};

export async function runReminderEmails(args: {
  now: Date;
  enabled: boolean;
  dryRun: boolean;
  enqueue: boolean;
  limit: number;
  secret: string;
  appUrl: string;
  rows: ReminderRow[];
  recentlySent: ReadonlySet<string>;
  optedOut: ReadonlySet<string>;
  profiles: EnqueueInput[];
  subscriptions: EnqueueSubscription[];
  existingKeys: ReadonlySet<string>;
  store: ReminderStore;
  deliver: (message: OutboundMail) => Promise<{ sent: boolean; reason: string }>;
}): Promise<ReminderRunResult> {
  const freshEnqueue = planReminderEnqueue({
    now: args.now,
    profiles: args.profiles,
    subscriptions: args.subscriptions,
    existingKeys: args.existingKeys,
    optedOut: args.optedOut,
  });
  const insertedForPlan: ReminderRow[] = freshEnqueue.map((row) => ({
    id: `new:${row.dedupeKey}`,
    userId: row.userId,
    email: row.email,
    kind: row.kind,
    createdAt: args.now.toISOString(),
    sentAt: null,
    claimedAt: null,
    locale: row.locale,
  }));
  const queueRows = args.enqueue ? [...args.rows, ...insertedForPlan] : args.rows;
  const plan = planReminderQueue({
    rows: queueRows,
    now: args.now,
    optedOut: args.optedOut,
    recentlySent: args.recentlySent,
    limit: args.limit,
  });
  const result: ReminderRunResult = {
    enabled: args.enabled,
    dryRun: args.dryRun,
    enqueue: args.enqueue,
    stale: plan.expire.length,
    skipped: plan.skip.length,
    failed: 0,
    sent: 0,
    wouldSend: countByKind(plan.send),
    wouldEnqueue: countByKind(freshEnqueue),
  };
  if (args.dryRun || !args.enabled) return result;
  if (!args.secret) throw new Error("CRON_SECRET is required to sign unsubscribe links.");

  for (const id of plan.expire) {
    if (id.startsWith("new:")) continue;
    await args.store.expire(id, args.now);
  }
  for (const item of plan.skip) {
    if (item.id.startsWith("new:")) continue;
    await args.store.skip(item.id, item.reason, args.now);
  }

  const inserted = new Map<string, ReminderRow>();
  if (args.enqueue) {
    const skippedNew = new Set(plan.skip.map((item) => item.id));
    for (const row of freshEnqueue) {
      const synthetic = `new:${row.dedupeKey}`;
      if (skippedNew.has(synthetic)) continue;
      const saved = await args.store.insert(row, args.now);
      if (saved) inserted.set(synthetic, saved);
    }
  }

  const origin = args.appUrl.replace(/\/$/, "");
  for (const planned of plan.send) {
    const row = planned.id.startsWith("new:") ? inserted.get(planned.id) : planned;
    if (!row) {
      result.failed += 1;
      continue;
    }
    const claimed = await args.store.claim(row.id, args.now);
    if (!claimed) {
      result.skipped += 1;
      continue;
    }
    const token = reminderUnsubscribeToken(row.userId, args.secret);
    const unsubscribeUrl = `${origin}/api/reminders/unsubscribe?token=${encodeURIComponent(token)}`;
    const lang = row.locale ? `?lang=${row.locale}` : "";
    const copy = buildReminderMessage({
      kind: row.kind,
      locale: row.locale,
      pricingUrl: `${origin}/pricing${lang}`,
      billingUrl: `${origin}/account/billing${lang}`,
      unsubscribeUrl,
    });
    const message: OutboundMail = {
      to: row.email,
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
      fromName: copy.fromName,
      fromAddress: copy.fromAddress,
      replyTo: copy.replyTo,
      extraHeaders: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
    try {
      const sent = await args.deliver(message);
      if (sent.sent) {
        await args.store.markSent(row.id, args.now);
        result.sent += 1;
      } else {
        await args.store.release(row.id);
        result.failed += 1;
        if (sent.reason === "not-configured") break;
      }
    } catch {
      await args.store.release(row.id);
      result.failed += 1;
    }
  }
  return result;
}
