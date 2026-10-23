import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { addDays } from "../lib/billingCycle";
import { shellCopy } from "../lib/shell";
import {
  decideReturnToAssistant,
  returnUserToAssistant,
  type BillingAccessRow,
} from "../lib/returnToFree";

const now = new Date("2026-10-23T12:00:00.000Z");

function billing(partial: Partial<BillingAccessRow>): BillingAccessRow {
  return {
    id: "bill-1",
    user_id: "user-1",
    plan: "engineer",
    billing_interval: "month",
    status: "active",
    current_period_end: addDays(now, 10).toISOString(),
    cancel_at_period_end: false,
    failure_count: 0,
    ...partial,
  };
}

describe("return to the free Assistant plan", () => {
  it("keeps a paid plan until the period ends", () => {
    const decision = decideReturnToAssistant({
      now,
      storedTier: "professional",
      billing: billing({}),
    });
    assert.equal(decision.ended, false);
    assert.equal(decision.plan, "professional");
    assert.equal(decision.write, false);
  });

  it("keeps access during the renewal retry window", () => {
    const decision = decideReturnToAssistant({
      now,
      storedTier: "engineer",
      billing: billing({
        status: "past_due",
        current_period_end: addDays(now, -1).toISOString(),
        failure_count: 1,
      }),
    });
    assert.equal(decision.ended, false);
    assert.equal(decision.reason, "grace");
    assert.equal(decision.plan, "engineer");
  });

  it("returns to Assistant after the grace window, after a cancel, and when the row is already closed", () => {
    const grace = decideReturnToAssistant({
      now,
      storedTier: "consultant",
      billing: billing({
        plan: "consultant",
        status: "past_due",
        current_period_end: addDays(now, -4).toISOString(),
        failure_count: 2,
      }),
    });
    assert.equal(grace.ended, true);
    assert.equal(grace.plan, "assistant");
    assert.equal(grace.reason, "grace_elapsed");
    assert.equal(grace.previousPlan, "consultant");
    assert.equal(grace.notice, true);

    const cancel = decideReturnToAssistant({
      now,
      storedTier: "engineer",
      billing: billing({
        cancel_at_period_end: true,
        current_period_end: addDays(now, -1).toISOString(),
      }),
    });
    assert.equal(cancel.reason, "cancel");
    assert.equal(cancel.plan, "assistant");

    const closed = decideReturnToAssistant({
      now,
      storedTier: "engineer",
      billing: billing({ status: "expired", current_period_end: addDays(now, -2).toISOString() }),
    });
    assert.equal(closed.ended, true);
    assert.equal(closed.write, true);

    const again = decideReturnToAssistant({
      now,
      storedTier: "assistant",
      billing: billing({ status: "expired", current_period_end: addDays(now, -2).toISOString() }),
    });
    assert.equal(again.write, false);
    assert.equal(again.plan, "assistant");
    assert.equal(again.notice, true);
  });

  it("keeps an active team seat when the personal plan has ended", () => {
    const decision = decideReturnToAssistant({
      now,
      storedTier: "engineer",
      billing: billing({
        plan: "engineer",
        status: "active",
        current_period_end: addDays(now, -4).toISOString(),
        failure_count: 3,
      }),
      teams: [{ plan: "team", status: "active", current_period_end: addDays(now, 20).toISOString() }],
    });
    assert.equal(decision.plan, "team");
    assert.equal(decision.ended, false);
    assert.equal(decision.notice, false);
    assert.equal(decision.write, true);
  });

  it("does not honour a lapsed team seat with no active membership", () => {
    const decision = decideReturnToAssistant({
      now,
      storedTier: "team",
      billing: null,
      teams: [{ plan: "team", status: "lapsed", current_period_end: addDays(now, -1).toISOString() }],
    });
    assert.equal(decision.plan, "assistant");
    assert.equal(decision.write, true);
  });

  it("writes Assistant once and keeps free-plan chat retention", async () => {
    const userId = "user-1";
    const created = addDays(now, -10).toISOString();
    const state: Record<string, Record<string, unknown>[]> = {
      profiles: [{ id: userId, subscription_tier: "engineer" }],
      billing_subscriptions: [
        {
          id: "bill-1",
          user_id: userId,
          plan: "engineer",
          billing_interval: "year",
          status: "active",
          current_period_end: addDays(now, -5).toISOString(),
          cancel_at_period_end: false,
          failure_count: 3,
        },
      ],
      subscriptions: [{ user_id: userId, plan: "engineer", status: "active", end_date: addDays(now, -5).toISOString() }],
      team_members: [],
      teams: [],
      conversations: [{ id: "chat-1", user_id: userId, created_at: created }],
    };

    const first = await returnUserToAssistant(memoryAdmin(state) as never, userId, now);
    assert.equal(first.ended, true);
    assert.equal(first.previousInterval, "year");
    assert.equal(state.profiles[0].subscription_tier, "assistant");
    assert.equal(state.billing_subscriptions[0].status, "expired");
    assert.equal(state.subscriptions[0].status, "expired");
    const expires = new Date(String(state.conversations[0].expires_at)).getTime();
    assert.equal(expires, new Date(created).getTime() + 3 * 24 * 60 * 60 * 1000);

    const second = await returnUserToAssistant(memoryAdmin(state) as never, userId, now);
    assert.equal(second.write, false);
    assert.equal(state.billing_subscriptions[0].status, "expired");
    assert.equal(state.profiles[0].subscription_tier, "assistant");
  });

  it("keeps team access and does not shorten chat history when only the personal plan ended", async () => {
    const userId = "user-2";
    const created = addDays(now, -10).toISOString();
    const state: Record<string, Record<string, unknown>[]> = {
      profiles: [{ id: userId, subscription_tier: "engineer" }],
      billing_subscriptions: [
        {
          id: "bill-personal",
          user_id: userId,
          plan: "engineer",
          billing_interval: "month",
          status: "past_due",
          current_period_end: addDays(now, -4).toISOString(),
          cancel_at_period_end: false,
          failure_count: 3,
        },
      ],
      subscriptions: [],
      team_members: [{ user_id: userId, team_id: "team-1", status: "active" }],
      teams: [{ id: "team-1", plan: "team", status: "active", current_period_end: addDays(now, 12).toISOString() }],
      conversations: [{ id: "chat-2", user_id: userId, created_at: created, expires_at: addDays(now, 20).toISOString() }],
    };

    const decision = await returnUserToAssistant(memoryAdmin(state) as never, userId, now);
    assert.equal(decision.plan, "team");
    assert.equal(decision.notice, false);
    assert.equal(state.profiles[0].subscription_tier, "team");
    assert.equal(state.billing_subscriptions[0].status, "expired");
    assert.equal(state.teams[0].status, "active");
    assert.equal(state.conversations[0].expires_at, addDays(now, 20).toISOString());
  });

  it("shows an English and Arabic renew notice and enforces the plan on the server", () => {
    assert.match(shellCopy.en.billing.endedBody, /free Assistant plan/);
    assert.match(shellCopy.en.billing.endedBody, /chat history/);
    assert.equal(shellCopy.en.billing.endedRenew, "Renew");
    assert.match(shellCopy.ar.billing.endedBody, /المساعد المجانية/);
    assert.match(shellCopy.ar.billing.endedBody, /سجل المحادثات/);
    assert.equal(shellCopy.ar.billing.endedRenew, "جدد");
    assert.doesNotMatch(shellCopy.ar.billing.endedBody, /[\u064B-\u0652]/);
    const chat = readFileSync("app/api/chat/route.ts", "utf8");
    const cron = readFileSync("app/api/cron/renewals/route.ts", "utf8");
    assert.match(chat, /returnUserToAssistant/);
    assert.match(cron, /returnExpiredPlans/);
    const chatPage = readFileSync("app/chat/page.tsx", "utf8");
    assert.match(chatPage, /endedRenew/);
    assert.match(chatPage, /notice === "ended" && billingJson\.plan === "assistant"/);
    assert.match(readFileSync("app/profile/page.tsx", "utf8"), /endedRenew/);
    assert.match(readFileSync("app/components/marketing/AccountState.tsx", "utf8"), /billingJson\.plan/);
  });
});

function memoryAdmin(state: Record<string, Record<string, unknown>[]>) {
  return {
    from(table: string) {
      const filters: { op: "eq" | "in"; column: string; value: unknown }[] = [];
      let payload: Record<string, unknown> | null = null;
      const run = (single: boolean) => {
        const rows = state[table] || [];
        const matched = rows.filter((row) =>
          filters.every((filter) => {
            if (filter.op === "eq") return row[filter.column] === filter.value;
            return Array.isArray(filter.value) && filter.value.includes(row[filter.column]);
          })
        );
        if (payload) {
          for (const row of matched) Object.assign(row, payload);
          return { data: matched, error: null };
        }
        return { data: single ? matched[0] || null : matched, error: null };
      };
      const builder = {
        select() {
          return builder;
        },
        update(next: Record<string, unknown>) {
          payload = next;
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push({ op: "eq", column, value });
          return builder;
        },
        in(column: string, value: unknown[]) {
          filters.push({ op: "in", column, value });
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle: async () => run(true),
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve(run(false)).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}
