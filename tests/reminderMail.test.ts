import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import {
  buildReminderMessage,
  isConfirmedAccount,
  planReminderEnqueue,
  planReminderQueue,
  reminderBatchLimit,
  reminderCronAuthorized,
  reminderEmailsEnabled,
  reminderEnqueueEnabled,
  reminderUnsubscribeToken,
  reminderUserFromToken,
  type ReminderKind,
  type ReminderRow,
} from "../lib/reminderMail";
import { runReminderEmails, type ReminderStore } from "../lib/reminderRun";

const NOW = new Date("2026-11-18T12:00:00.000Z");
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function row(partial: Partial<ReminderRow> & { id: string; kind: ReminderKind }): ReminderRow {
  return {
    userId: USER,
    email: "engineer@example.com",
    createdAt: "2026-11-17T00:00:00.000Z",
    sentAt: null,
    claimedAt: null,
    locale: "en",
    ...partial,
  };
}

function memoryStore() {
  const expired: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const sent: string[] = [];
  const inserted: string[] = [];
  let sequence = 0;
  const store: ReminderStore = {
    async expire(id) {
      expired.push(id);
    },
    async skip(id, reason) {
      skipped.push({ id, reason });
    },
    async claim() {
      return true;
    },
    async markSent(id) {
      sent.push(id);
    },
    async release() {},
    async insert(row) {
      sequence += 1;
      inserted.push(row.dedupeKey);
      return {
        id: `saved-${sequence}`,
        userId: row.userId,
        email: row.email,
        kind: row.kind,
        createdAt: NOW.toISOString(),
        sentAt: null,
        claimedAt: null,
        locale: row.locale,
      };
    },
  };
  return { store, expired, skipped, sent, inserted };
}

describe("reminder queue", () => {
  it("expires the Feb-Mar backlog and sends nothing on the first run", async () => {
    const kinds: ReminderKind[] = ["assistant_weekly_upsell", "sub_expired_weekly", "sub_expiring_3d"];
    const rows: ReminderRow[] = [];
    for (let i = 0; i < 100; i += 1) {
      const day = 8 + (i % 36);
      const month = day <= 28 ? "02" : "03";
      const date = day <= 28 ? String(day).padStart(2, "0") : String(day - 28).padStart(2, "0");
      rows.push(
        row({
          id: `old-${i}`,
          userId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
          email: `user${i}@example.com`,
          kind: kinds[i % 3],
          createdAt: `2026-${month}-${date}T00:00:00.000Z`,
        })
      );
    }
    const memory = memoryStore();
    let deliveries = 0;
    const result = await runReminderEmails({
      now: NOW,
      enabled: true,
      dryRun: false,
      enqueue: false,
      limit: 40,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      rows,
      recentlySent: new Set(),
      optedOut: new Set(),
      profiles: [],
      subscriptions: [],
      existingKeys: new Set(),
      store: memory.store,
      deliver: async () => {
        deliveries += 1;
        return { sent: true, reason: "smtp" };
      },
    });
    assert.equal(result.sent, 0);
    assert.equal(result.stale, 100);
    assert.equal(deliveries, 0);
    assert.equal(memory.expired.length, 100);
    assert.equal(memory.sent.length, 0);
    assert.deepEqual(result.wouldSend, {
      assistant_weekly_upsell: 0,
      sub_expired_weekly: 0,
      sub_expiring_3d: 0,
    });
  });

  it("does not write or send in dry-run, and stays idle while the switch is off", async () => {
    const rows = [row({ id: "fresh", kind: "assistant_weekly_upsell" })];
    const memory = memoryStore();
    const dry = await runReminderEmails({
      now: NOW,
      enabled: true,
      dryRun: true,
      enqueue: false,
      limit: 40,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      rows,
      recentlySent: new Set(),
      optedOut: new Set(),
      profiles: [],
      subscriptions: [],
      existingKeys: new Set(),
      store: memory.store,
      deliver: async () => {
        throw new Error("dry-run must not send");
      },
    });
    assert.equal(dry.sent, 0);
    assert.equal(dry.wouldSend.assistant_weekly_upsell, 1);
    assert.equal(memory.expired.length, 0);
    assert.equal(memory.sent.length, 0);

    const off = await runReminderEmails({
      now: NOW,
      enabled: false,
      dryRun: false,
      enqueue: false,
      limit: 40,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      rows: [row({ id: "old", kind: "sub_expired_weekly", createdAt: "2026-03-01T00:00:00.000Z" })],
      recentlySent: new Set(),
      optedOut: new Set(),
      profiles: [],
      subscriptions: [],
      existingKeys: new Set(),
      store: memory.store,
      deliver: async () => {
        throw new Error("disabled run must not send");
      },
    });
    assert.equal(off.enabled, false);
    assert.equal(off.sent, 0);
    assert.equal(memory.expired.length, 0);
  });

  it("sends at most one fresh email per user per week and skips an unsubscribe", async () => {
    const memory = memoryStore();
    const messages: { to: string; text?: string; html?: string; headers?: Record<string, string> }[] = [];
    const result = await runReminderEmails({
      now: NOW,
      enabled: true,
      dryRun: false,
      enqueue: false,
      limit: 40,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      rows: [
        row({ id: "upsell", kind: "assistant_weekly_upsell", createdAt: "2026-11-16T00:00:00.000Z" }),
        row({ id: "expiring", kind: "sub_expiring_3d", createdAt: "2026-11-17T00:00:00.000Z" }),
        row({
          id: "other",
          userId: OTHER,
          email: "other@example.com",
          kind: "sub_expired_weekly",
          createdAt: "2026-11-17T00:00:00.000Z",
        }),
      ],
      recentlySent: new Set([OTHER]),
      optedOut: new Set(),
      profiles: [],
      subscriptions: [],
      existingKeys: new Set(),
      store: memory.store,
      deliver: async (message) => {
        messages.push({
          to: message.to,
          text: message.text,
          html: message.html,
          headers: message.extraHeaders,
        });
        return { sent: true, reason: "smtp" };
      },
    });
    assert.equal(result.sent, 1);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].to, "engineer@example.com");
    assert.match(messages[0].text || "", /\/api\/reminders\/unsubscribe\?token=/);
    assert.match(messages[0].html || "", /unsubscribe\?token=/);
    assert.match(messages[0].headers?.["List-Unsubscribe"] || "", /unsubscribe\?token=/);
    assert.equal(memory.sent.length, 1);
    assert.ok(memory.skipped.some((item) => item.id === "upsell" && item.reason === "weekly-cap"));
    assert.ok(memory.skipped.some((item) => item.id === "other" && item.reason === "weekly-cap"));

    const opted = memoryStore();
    const optedResult = await runReminderEmails({
      now: NOW,
      enabled: true,
      dryRun: false,
      enqueue: false,
      limit: 40,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      rows: [row({ id: "fresh", kind: "assistant_weekly_upsell" })],
      recentlySent: new Set(),
      optedOut: new Set([USER]),
      profiles: [],
      subscriptions: [],
      existingKeys: new Set(),
      store: opted.store,
      deliver: async () => {
        throw new Error("unsubscribed user must not be mailed");
      },
    });
    assert.equal(optedResult.sent, 0);
    assert.equal(opted.skipped[0]?.reason, "unsubscribed");
  });

  it("does not backfill a March expiry, and a missing timestamp is stale", () => {
    const planned = planReminderEnqueue({
      now: NOW,
      profiles: [
        { id: USER, email: "engineer@example.com", tier: "assistant", confirmed: true },
        { id: OTHER, email: "paid@example.com", tier: "engineer", confirmed: true },
      ],
      subscriptions: [
        {
          userId: OTHER,
          email: "paid@example.com",
          status: "expired",
          periodEnd: "2026-03-15T00:00:00.000Z",
          locale: "ar",
          confirmed: true,
        },
        {
          userId: "33333333-3333-4333-8333-333333333333",
          email: "ending@example.com",
          status: "active",
          periodEnd: "2026-11-20T00:00:00.000Z",
          locale: "en",
          confirmed: true,
        },
      ],
      existingKeys: new Set(),
      optedOut: new Set(),
    });
    const kinds = planned.map((row) => row.kind).sort();
    assert.deepEqual(kinds, ["assistant_weekly_upsell", "sub_expiring_3d"]);
    assert.equal(planned.some((row) => row.kind === "sub_expired_weekly"), false);

    const stale = planReminderQueue({
      rows: [row({ id: "blank", kind: "assistant_weekly_upsell", createdAt: "" })],
      now: NOW,
      optedOut: new Set(),
      recentlySent: new Set(),
      limit: 40,
    });
    assert.deepEqual(stale.expire, ["blank"]);
    assert.equal(stale.send.length, 0);
  });

  it("queues one current reminder per confirmed user and does not repeat it", async () => {
    const ending = "33333333-3333-4333-8333-333333333333";
    const ended = "44444444-4444-4444-8444-444444444444";
    const unconfirmed = "55555555-5555-4555-8555-555555555555";
    const opted = "66666666-6666-4666-8666-666666666666";
    const planned = planReminderEnqueue({
      now: NOW,
      profiles: [
        { id: USER, email: "free@example.com", tier: "assistant", confirmed: true },
        { id: unconfirmed, email: "new@example.com", tier: "assistant", confirmed: false },
        { id: opted, email: "opted@example.com", tier: "assistant", confirmed: true },
        { id: ended, email: "ended@example.com", tier: "assistant", confirmed: true },
        { id: "77777777-7777-4777-8777-777777777777", email: "maxxspace@example.com", tier: "assistant", confirmed: true },
      ],
      subscriptions: [
        {
          userId: ending,
          email: "ending@example.com",
          status: "active",
          periodEnd: "2026-11-20T00:00:00.000Z",
          locale: "en",
          confirmed: true,
        },
        {
          userId: ended,
          email: "ended@example.com",
          status: "expired",
          periodEnd: "2026-11-16T00:00:00.000Z",
          locale: "ar",
          confirmed: true,
        },
        {
          userId: OTHER,
          email: "old@example.com",
          status: "expired",
          periodEnd: "2026-03-15T00:00:00.000Z",
          locale: "en",
          confirmed: true,
        },
        {
          userId: unconfirmed,
          email: "new@example.com",
          status: "active",
          periodEnd: "2026-11-19T00:00:00.000Z",
          locale: "en",
          confirmed: false,
        },
      ],
      existingKeys: new Set(),
      optedOut: new Set([opted]),
    });
    assert.deepEqual(
      planned.map((row) => `${row.kind}:${row.userId}`).sort(),
      [
        `assistant_weekly_upsell:${USER}`,
        `sub_expired_weekly:${ended}`,
        `sub_expiring_3d:${ending}`,
      ].sort()
    );
    const keys = new Set(planned.map((row) => row.dedupeKey));
    const again = planReminderEnqueue({
      now: NOW,
      profiles: [{ id: USER, email: "free@example.com", tier: "assistant", confirmed: true }],
      subscriptions: [
        {
          userId: ending,
          email: "ending@example.com",
          status: "active",
          periodEnd: "2026-11-20T00:00:00.000Z",
          locale: "en",
          confirmed: true,
        },
      ],
      existingKeys: keys,
      optedOut: new Set(),
    });
    assert.deepEqual(again, []);
    assert.equal(isConfirmedAccount(null), false);
    assert.equal(isConfirmedAccount("2026-01-07T00:00:00.000Z"), true);

    const memory = memoryStore();
    const dry = await runReminderEmails({
      now: NOW,
      enabled: false,
      dryRun: true,
      enqueue: true,
      limit: 40,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      rows: [],
      recentlySent: new Set(),
      optedOut: new Set([opted]),
      profiles: [{ id: USER, email: "free@example.com", tier: "assistant", confirmed: true }],
      subscriptions: [],
      existingKeys: new Set(),
      store: memory.store,
      deliver: async () => {
        throw new Error("dry-run must not send");
      },
    });
    assert.equal(dry.wouldEnqueue.assistant_weekly_upsell, 1);
    assert.equal(dry.sent, 0);
    assert.equal(memory.inserted.length, 0);
  });

  it("signs an unsubscribe token and keeps the switches off by default", () => {
    const token = reminderUnsubscribeToken(USER, "cron-secret");
    assert.equal(reminderUserFromToken(token, "cron-secret"), USER);
    assert.equal(reminderUserFromToken(token, "other"), null);
    const message = buildReminderMessage({
      kind: "sub_expiring_3d",
      locale: "ar",
      pricingUrl: "https://engineerit.ai/pricing?lang=ar",
      billingUrl: "https://engineerit.ai/account/billing?lang=ar",
      unsubscribeUrl: "https://engineerit.ai/api/reminders/unsubscribe?token=abc",
    });
    assert.match(message.html, /lang="ar"/);
    assert.match(message.html, /إلغاء هذه الرسائل/);
    assert.equal(reminderEmailsEnabled({} as NodeJS.ProcessEnv), false);
    assert.equal(reminderEnqueueEnabled({} as NodeJS.ProcessEnv), false);
    assert.equal(reminderEmailsEnabled({ REMINDER_EMAILS: "on" } as NodeJS.ProcessEnv), true);
    assert.equal(reminderBatchLimit("9000"), 200);
    assert.equal(reminderCronAuthorized("Bearer secret", null, "secret"), true);
    assert.equal(reminderCronAuthorized(null, null, "secret"), false);
  });

  it("wires the cron, the unsubscribe link, and service-role-only grants", () => {
    const cron = fs.readFileSync("app/api/cron/reminders/route.ts", "utf8");
    const vercel = fs.readFileSync("vercel.json", "utf8");
    const sql = fs.readFileSync("supabase/migrations/20261118140000_email_notifications.sql", "utf8");
    assert.match(cron, /reminderCronAuthorized/);
    assert.match(cron, /dryRun/);
    assert.equal(cron.includes("enqueue_subscription_emails("), false);
    assert.match(vercel, /\/api\/cron\/reminders/);
    assert.match(sql, /status in \('pending', 'sent', 'skipped', 'expired'\)/);
    assert.match(sql, /now\(\) - interval '30 days'/);
    assert.match(sql, /revoke all on table public\.email_notifications from public, anon, authenticated/);
    assert.match(sql, /grant all on table public\.email_notifications to service_role/);
    assert.match(sql, /revoke all on table public\.email_notification_opt_outs from public, anon, authenticated/);
    const audience = fs.readFileSync("lib/reminderQueue.ts", "utf8");
    assert.match(audience, /email_confirmed_at/);
    assert.match(audience, /isConfirmedAccount/);
    const unsubscribe = fs.readFileSync("app/api/reminders/unsubscribe/route.ts", "utf8");
    assert.match(unsubscribe, /recordReminderOptOut/);
  });
});
