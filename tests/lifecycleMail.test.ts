import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import {
  buildLifecycleCandidates,
  localeFromUser,
  paidAccess,
} from "../lib/lifecycleAudience";
import {
  EXTRA_SEAT_SAR,
  PLAN_AMOUNTS_SAR,
} from "../lib/plans";
import {
  LIFECYCLE_FROM_ADDRESS,
  LIFECYCLE_PRICING_URL,
  LIFECYCLE_SIGNATURE,
  LIFECYCLE_SUPPORT_LINE,
  buildLifecycleMessage,
  claimOutcome,
  lifecycleBatchLimit,
  lifecycleCronAuthorized,
  lifecycleDecision,
  lifecycleEmailsEnabled,
  lifecycleUnsubscribeToken,
  lifecycleUserFromToken,
  selectDueLifecycle,
  unsubscribePage,
  type LifecycleCandidate,
} from "../lib/lifecycleMail";
import { memoryLifecycleMailer, runLifecycleEmails } from "../lib/lifecycleRun";
import { feedbackTableMissing, parsePlatformFeedback, presentFeedback, summarizePlatformFeedback } from "../lib/platformFeedback";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-23T04:30:00.000Z");
const USER = "11111111-1111-4111-8111-111111111111";

function candidate(partial: Partial<LifecycleCandidate> & Pick<LifecycleCandidate, "id" | "createdAt">): LifecycleCandidate {
  return {
    email: "person@example.com",
    locale: "en",
    paid: false,
    optedOut: false,
    lastSentAt: null,
    ...partial,
  };
}

describe("lifecycle schedule", () => {
  it("sends the first note at 21 days, then every 30 days, once per cycle", () => {
    const created = new Date(NOW.getTime() - 21 * DAY).toISOString();
    const first = lifecycleDecision({ createdAt: created, lastSentAt: null }, NOW);
    assert.equal(first?.due, true);
    assert.equal(first?.cycleKey, "first");

    const early = lifecycleDecision(
      { createdAt: new Date(NOW.getTime() - 21 * DAY + 60_000).toISOString(), lastSentAt: null },
      NOW
    );
    assert.equal(early?.due, false);

    const sentAt = new Date(NOW.getTime() - 30 * DAY).toISOString();
    const monthly = lifecycleDecision({ createdAt: created, lastSentAt: sentAt }, NOW);
    assert.equal(monthly?.due, true);
    assert.equal(monthly?.cycleKey, "m:2026-10-23");

    const tooSoon = lifecycleDecision(
      { createdAt: created, lastSentAt: new Date(NOW.getTime() - 30 * DAY + 60_000).toISOString() },
      NOW
    );
    assert.equal(tooSoon?.due, false);
    assert.equal(tooSoon?.cycleKey, monthly?.cycleKey);
  });

  it("skips opt-outs and caps the run", () => {
    const created = new Date(NOW.getTime() - 40 * DAY).toISOString();
    const users = [
      candidate({ id: "c", createdAt: new Date(NOW.getTime() - 30 * DAY).toISOString() }),
      candidate({ id: "a", createdAt: created, optedOut: true }),
      candidate({ id: "b", createdAt: new Date(NOW.getTime() - 50 * DAY).toISOString() }),
    ];
    const due = selectDueLifecycle(users, NOW, 1);
    assert.equal(due.length, 1);
    assert.equal(due[0].id, "b");
  });

  it("does not reclaim a fresh queue row, and does retry a stale one", () => {
    assert.equal(claimOutcome(null, 0), "insert");
    assert.equal(claimOutcome({ status: "sent", claimedAt: 0 }, 10), "skip");
    assert.equal(claimOutcome({ status: "queued", claimedAt: 1_000 }, 1_000 + 5 * 60 * 1000), "skip");
    assert.equal(claimOutcome({ status: "queued", claimedAt: 0 }, 15 * 60 * 1000), "send");
    assert.equal(claimOutcome({ status: "queued", claimedAt: null }, 10), "send");
  });
});

describe("lifecycle copy", () => {
  const feedbackUrl = "https://engineerit.ai/feedback/review";
  const unsubscribeUrl = "https://engineerit.ai/api/lifecycle/unsubscribe?token=abc";

  it("keeps the published prices", () => {
    assert.equal(PLAN_AMOUNTS_SAR.engineer.month, 19);
    assert.equal(PLAN_AMOUNTS_SAR.professional.month, 41);
    assert.equal(PLAN_AMOUNTS_SAR.consultant.month, 99);
    assert.equal(PLAN_AMOUNTS_SAR.team.month, 449);
    assert.equal(EXTRA_SEAT_SAR.month, 89);
    assert.equal(PLAN_AMOUNTS_SAR.enterprise.month, 3900);
  });

  it("asks paid accounts for an opinion and does not sell a plan", () => {
    const message = buildLifecycleMessage({ locale: "en", paid: true, feedbackUrl, unsubscribeUrl });
    assert.equal(message.fromAddress, LIFECYCLE_FROM_ADDRESS);
    assert.equal(message.fromAddress, "support@engineerit.ai");
    assert.match(message.text, new RegExp(LIFECYCLE_SUPPORT_LINE.replace(/[.]/g, "\\.")));
    assert.match(message.text, new RegExp(LIFECYCLE_SIGNATURE));
    assert.match(message.text, /What do you like/);
    assert.equal(message.text.includes("SAR 19"), false);
    assert.equal(message.text.includes(LIFECYCLE_PRICING_URL), false);
    assert.equal(message.html.includes(LIFECYCLE_PRICING_URL), false);
    assert.equal(/founder/i.test(message.text), false);
    assert.match(message.html, new RegExp(`href="${unsubscribeUrl.replace(/[?]/g, "\\?")}"`));
  });

  it("invites free accounts to the Engineer plan", () => {
    const message = buildLifecycleMessage({ locale: "en", paid: false, feedbackUrl, unsubscribeUrl });
    assert.match(message.text, /SAR 19\/month/);
    assert.match(message.text, /engineer it community/);
    assert.match(message.text, /three replies a day/);
    assert.match(message.text, /drawing and design tools/);
    assert.match(message.text, new RegExp(LIFECYCLE_PRICING_URL.replace(/[.]/g, "\\.")));
    assert.match(message.text, new RegExp(LIFECYCLE_SUPPORT_LINE.replace(/[.]/g, "\\.")));
    assert.match(message.text, new RegExp(LIFECYCLE_SIGNATURE));
    assert.equal(message.kind, "feedback_subscribe");
  });

  it("uses Arabic when the account language is known, and both languages when it is not", () => {
    const arabic = buildLifecycleMessage({ locale: "ar", paid: false, feedbackUrl, unsubscribeUrl });
    assert.match(arabic.subject, /ما رأيك/);
    assert.match(arabic.text, /ما الذي يعجبك/);
    assert.match(arabic.text, /SAR 19/);
    assert.match(arabic.text, new RegExp(LIFECYCLE_SUPPORT_LINE.replace(/[.]/g, "\\.")));
    assert.equal(arabic.text.includes("What do you like"), false);

    const both = buildLifecycleMessage({ locale: null, paid: true, feedbackUrl, unsubscribeUrl });
    assert.match(both.text, /What do you like/);
    assert.match(both.text, /ما الذي يعجبك/);
    assert.equal(both.text.includes(LIFECYCLE_PRICING_URL), false);
    assert.equal(both.locale, "both");
  });

  it("signs and checks a one-click unsubscribe token", () => {
    const token = lifecycleUnsubscribeToken(USER, "cron-secret");
    assert.equal(lifecycleUserFromToken(token, "cron-secret"), USER);
    assert.equal(lifecycleUserFromToken(token, "other"), null);
    assert.equal(lifecycleUserFromToken(`${USER}.nope`, "cron-secret"), null);
    const page = unsubscribePage("done");
    assert.match(page, /You will not receive these feedback emails/);
    assert.equal(page.includes("<form"), false);
    assert.match(page, new RegExp(LIFECYCLE_SUPPORT_LINE.replace(/[.]/g, "\\.")));
  });
});

describe("who is paid, and who is due", () => {
  it("treats an open paid plan or an active team seat as paid, and a stored team tier alone as free", () => {
    assert.equal(paidAccess({ tier: "assistant", billingPaid: false, teamPaid: false }), false);
    assert.equal(paidAccess({ tier: "engineer", billingPaid: false, teamPaid: false }), true);
    assert.equal(paidAccess({ tier: "assistant", billingPaid: true, teamPaid: false }), true);
    assert.equal(paidAccess({ tier: "assistant", billingPaid: false, teamPaid: true }), true);
    assert.equal(paidAccess({ tier: "team", billingPaid: false, teamPaid: false }), false);
    assert.equal(localeFromUser("ar", { locale: "en" }), "ar");
    assert.equal(localeFromUser(null, { lang: "ar-SA" }), "ar");
    assert.equal(localeFromUser(null, {}), null);
  });

  it("drops test inboxes, banned accounts, and blank emails", () => {
    const rows = buildLifecycleCandidates({
      now: NOW,
      users: [
        { id: USER, email: "person@example.com", createdAt: NOW.toISOString(), metadata: { locale: "en" } },
        { id: "22222222-2222-4222-8222-222222222222", email: "eit-pw-a@maxxspace.com", createdAt: NOW.toISOString() },
        {
          id: "33333333-3333-4333-8333-333333333333",
          email: "banned@example.com",
          createdAt: NOW.toISOString(),
          bannedUntil: new Date(NOW.getTime() + DAY).toISOString(),
        },
        { id: "44444444-4444-4444-8444-444444444444", email: "  ", createdAt: NOW.toISOString() },
      ],
      optedOut: new Set([USER]),
      lastSentAt: new Map(),
      tiers: new Map([[USER, "assistant"]]),
      billingLocale: new Map(),
      billingPaid: new Set(),
      teamPaid: new Set(),
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].optedOut, true);
    assert.equal(rows[0].paid, false);
    assert.equal(rows[0].locale, "en");
  });
});

describe("lifecycle send", () => {
  const created = new Date(NOW.getTime() - 22 * DAY).toISOString();

  function users(): LifecycleCandidate[] {
    return [
      candidate({ id: USER, createdAt: created, paid: false, locale: "en" }),
      candidate({
        id: "22222222-2222-4222-8222-222222222222",
        email: "paid@example.com",
        createdAt: created,
        paid: true,
        locale: "ar",
      }),
    ];
  }

  it("sends each due account once and does not send when the switch is off", async () => {
    const sent: string[] = [];
    const queue = memoryLifecycleMailer();
    const first = await runLifecycleEmails({
      now: NOW,
      enabled: true,
      dryRun: false,
      limit: 10,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      users: users(),
      mailer: queue.mailer,
      deliver: async (message) => {
        sent.push(message.to);
        assert.equal(message.fromAddress, "support@engineerit.ai");
        assert.match(message.text || "", new RegExp(LIFECYCLE_SUPPORT_LINE.replace(/[.]/g, "\\.")));
        assert.match(message.text || "", /The engineer it team|فريق engineer it/);
        assert.match(message.extraHeaders?.["List-Unsubscribe"] || "", /unsubscribe\?token=/);
        if (message.to === "paid@example.com") {
          assert.match(message.text || "", /lang=ar/);
          assert.equal((message.text || "").includes("SAR 19"), false);
        }
        if (message.to === "person@example.com") {
          assert.match(message.text || "", /lang=en/);
          assert.match(message.text || "", /SAR 19\/month/);
        }
        return { sent: true, sink: null, reason: "smtp" };
      },
    });
    assert.equal(first.sent, 2);
    assert.deepEqual(sent.sort(), ["paid@example.com", "person@example.com"]);

    const again = await runLifecycleEmails({
      now: NOW,
      enabled: true,
      dryRun: false,
      limit: 10,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      users: users(),
      mailer: queue.mailer,
      deliver: async () => {
        throw new Error("duplicate");
      },
    });
    assert.equal(again.sent, 0);
    assert.equal(again.skipped, 2);

    const held = await runLifecycleEmails({
      now: NOW,
      enabled: false,
      dryRun: false,
      limit: 10,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      users: users(),
      mailer: memoryLifecycleMailer().mailer,
      deliver: async () => {
        throw new Error("should not send");
      },
    });
    assert.equal(held.sent, 0);
    assert.equal(held.due, 0);
  });

  it("does not mark a failed send as delivered, and a dry run does not send", async () => {
    const queue = memoryLifecycleMailer();
    const failed = await runLifecycleEmails({
      now: NOW,
      enabled: true,
      dryRun: false,
      limit: 1,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      users: [candidate({ id: USER, createdAt: created })],
      mailer: queue.mailer,
      deliver: async () => ({ sent: false, sink: null, reason: "not-configured" }),
    });
    assert.equal(failed.sent, 0);
    assert.equal(failed.failed, 1);

    const retry = await runLifecycleEmails({
      now: new Date(NOW.getTime() + 60_000),
      enabled: true,
      dryRun: false,
      limit: 1,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      users: [candidate({ id: USER, createdAt: created })],
      mailer: queue.mailer,
      deliver: async () => ({ sent: true, sink: null, reason: "smtp" }),
    });
    assert.equal(retry.sent, 1);

    let called = false;
    const dry = await runLifecycleEmails({
      now: NOW,
      enabled: false,
      dryRun: true,
      limit: 5,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      users: users(),
      mailer: memoryLifecycleMailer().mailer,
      deliver: async () => {
        called = true;
        return { sent: true, sink: null, reason: "smtp" };
      },
    });
    assert.equal(dry.due, 2);
    assert.equal(dry.sent, 0);
    assert.equal(called, false);
  });

  it("stops after the batch cap", async () => {
    const many = Array.from({ length: 5 }, (_, index) =>
      candidate({
        id: `55555555-5555-4555-8555-55555555555${index}`,
        email: `user${index}@example.com`,
        createdAt: new Date(NOW.getTime() - (30 + index) * DAY).toISOString(),
      })
    );
    const result = await runLifecycleEmails({
      now: NOW,
      enabled: true,
      dryRun: false,
      limit: 2,
      secret: "cron-secret",
      appUrl: "https://engineerit.ai",
      users: many,
      mailer: memoryLifecycleMailer().mailer,
      deliver: async () => ({ sent: true, sink: null, reason: "smtp" }),
    });
    assert.equal(result.due, 2);
    assert.equal(result.sent, 2);
  });
});

describe("platform feedback", () => {
  it("accepts a rating and optional notes", () => {
    assert.deepEqual(parsePlatformFeedback({ rating: 4, liked: "  the chat  ", improve: "" }), {
      ok: true,
      rating: 4,
      liked: "the chat",
      improve: null,
    });
    assert.equal(parsePlatformFeedback({ rating: 0 }).ok, false);
    assert.equal(parsePlatformFeedback({ rating: 5, liked: "x".repeat(2500) }).ok, true);
    const parsed = parsePlatformFeedback({ rating: "5", liked: "x".repeat(2500) });
    assert.equal(parsed.ok && parsed.liked?.length, 2000);
  });

  it("treats a missing feedback table as unset, and still renders a real summary", () => {
    assert.equal(
      feedbackTableMissing({
        code: "PGRST205",
        message: "Could not find the table 'public.platform_feedback' in the schema cache",
      }),
      true
    );
    assert.equal(
      feedbackTableMissing({ code: "42P01", message: 'relation "public.platform_feedback" does not exist' }),
      true
    );
    assert.equal(
      feedbackTableMissing(new Error("Could not find the table 'public.platform_feedback' in the schema cache")),
      true
    );
    assert.equal(feedbackTableMissing({ code: "42501", message: "permission denied for table profiles" }), false);
    assert.deepEqual(presentFeedback(null), { ready: false });
    assert.deepEqual(presentFeedback({ count: 0, averageRating: null }), {
      ready: true,
      count: 0,
      averageRating: null,
      latest: [],
    });
    const shown = presentFeedback({
      count: 2,
      averageRating: 4,
      latest: [{ rating: 5, liked: "chat", improve: null, createdAt: "2026-10-02T00:00:00.000Z" }],
    });
    assert.equal(shown.ready, true);
    if (shown.ready) {
      assert.equal(shown.count, 2);
      assert.equal(shown.latest[0].liked, "chat");
    }
  });

  it("summarizes count, average, and the latest written notes", () => {
    const summary = summarizePlatformFeedback(
      [5, 3, 4],
      [
        { rating: 5, liked: "chat", improve: null, created_at: "2026-10-02T00:00:00.000Z" },
        { rating: 3, liked: null, improve: "  ", created_at: "2026-10-01T00:00:00.000Z" },
        { rating: 4, liked: null, improve: "exports", created_at: "2026-09-01T00:00:00.000Z" },
      ]
    );
    assert.equal(summary.count, 3);
    assert.equal(summary.averageRating, 4);
    assert.equal(summary.latest.length, 2);
    assert.equal(summary.latest[0].liked, "chat");
    assert.equal(summary.latest[1].improve, "exports");
  });
});

describe("lifecycle switches and grants", () => {
  it("stays off unless LIFECYCLE_EMAILS=on, and the cron requires the secret", () => {
    assert.equal(lifecycleEmailsEnabled({} as unknown as NodeJS.ProcessEnv), false);
    assert.equal(lifecycleEmailsEnabled({ LIFECYCLE_EMAILS: "off" } as unknown as NodeJS.ProcessEnv), false);
    assert.equal(lifecycleEmailsEnabled({ LIFECYCLE_EMAILS: "on" } as unknown as NodeJS.ProcessEnv), true);
    assert.equal(lifecycleBatchLimit("10"), 10);
    assert.equal(lifecycleBatchLimit("9000"), 200);
    assert.equal(lifecycleBatchLimit(undefined), 40);
    assert.equal(lifecycleCronAuthorized("Bearer secret", null, "secret"), true);
    assert.equal(lifecycleCronAuthorized("Bearer no", null, "secret"), false);
    assert.equal(lifecycleCronAuthorized(null, "secret", "secret"), true);
    assert.equal(lifecycleCronAuthorized("Bearer secret", null, undefined), false);
  });

  it("grants feedback inserts to the signed-in user and keeps the enqueue functions off the client", () => {
    const sql = fs.readFileSync("supabase/migrations/20261023160000_lifecycle_feedback.sql", "utf8");
    assert.match(sql, /alter table public\.platform_feedback enable row level security/);
    assert.match(sql, /alter table public\.platform_feedback force row level security/);
    assert.match(sql, /revoke all on table public\.platform_feedback from public, anon, authenticated/);
    assert.match(sql, /grant insert on table public\.platform_feedback to authenticated/);
    assert.match(sql, /grant all on table public\.platform_feedback to service_role/);
    assert.match(sql, /auth\.uid\(\) = user_id/);
    assert.equal(/for select/i.test(sql), false);
    assert.match(sql, /revoke all on function public\.enqueue_lifecycle_feedback_emails\(uuid, text, text, text, text, text, text, text\)\s+from public, anon, authenticated/);
    assert.match(sql, /grant execute on function public\.enqueue_lifecycle_feedback_emails\(uuid, text, text, text, text, text, text, text\)\s+to service_role/);
    assert.match(sql, /revoke all on [\s\S]*enqueue_subscription_emails[\s\S]*from public, anon, authenticated/);
    assert.match(sql, /grant execute on [\s\S]*enqueue_subscription_emails[\s\S]*to service_role/);
    assert.equal(/grant (insert|select|all) on table public\.platform_feedback to anon/.test(sql), false);

    const route = fs.readFileSync("app/api/feedback/platform/route.ts", "utf8");
    assert.match(route, /platform_feedback/);
    assert.match(route, /status: 409/);
    assert.match(route, /unavailable/);
    assert.equal(/getSupabaseAdmin|SERVICE_ROLE|supabaseAdmin/.test(route), false);
    const stats = fs.readFileSync("app/api/admin/stats/route.ts", "utf8");
    assert.match(stats, /feedbackTableMissing/);

    const cron = fs.readFileSync("app/api/cron/lifecycle/route.ts", "utf8");
    assert.match(cron, /getSupabaseAdmin/);
    assert.match(cron, /lifecycleCronAuthorized/);
    assert.equal(cron.includes("enqueue_subscription_emails("), false);
  });
});
