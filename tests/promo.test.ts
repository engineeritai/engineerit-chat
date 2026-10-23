import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import { assessPaidInvoice, createMoyasarTokenPayment } from "../lib/moyasar";
import { PLAN_AMOUNTS_SAR, quoteSelfServe } from "../lib/plans";
import {
  buildBatchCodes,
  buildRewardCode,
  canRedeemFree,
  decideQuestionAttempt,
  emailMatchesDomain,
  evaluatePromo,
  gradeWeeklyAnswer,
  normalizePromoCode,
  parsePromoDraft,
  priceCheckout,
  priceRenewalWithPromo,
  publicWeeklyQuestion,
  type PromoCode,
  type WeeklyQuestionRow,
} from "../lib/promo";
import { applyPromo, type PromoCheckoutRow, type PromoDb } from "../lib/promoCheckout";
import { missingPromoSchema, promoRenewalUpdate } from "../lib/promoSchema";

const NOW = new Date("2026-10-23T12:00:00.000Z");

function code(partial: Partial<PromoCode> & Pick<PromoCode, "discountType">): PromoCode {
  return {
    id: partial.id || "code-1",
    code: partial.code || "GIFT10",
    discountType: partial.discountType,
    percentOff: partial.percentOff ?? null,
    amountOffSar: partial.amountOffSar ?? null,
    freeMonths: partial.freeMonths ?? null,
    plans: partial.plans || [],
    intervals: partial.intervals || ["month", "year"],
    cycles: partial.cycles ?? 1,
    startsAt: partial.startsAt ?? "2026-10-01T00:00:00.000Z",
    expiresAt: partial.expiresAt ?? "2026-12-01T00:00:00.000Z",
    maxUses: partial.maxUses ?? null,
    onePerUser: partial.onePerUser ?? true,
    audience: partial.audience || "any",
    domains: partial.domains || [],
    singleUse: partial.singleUse ?? false,
    active: partial.active ?? true,
    restrictedUserId: partial.restrictedUserId ?? null,
    requiresStudent: partial.requiresStudent ?? false,
  };
}

function facts(partial: Partial<Parameters<typeof evaluatePromo>[1]> = {}) {
  return {
    now: NOW,
    userId: "user-1",
    email: "student@ksu.edu.sa",
    planId: "engineer",
    interval: "month" as const,
    listHalalas: 1900,
    uses: 0,
    userUses: 0,
    hasOpenSubscription: false,
    hasPaidBefore: false,
    ...partial,
  };
}

type Memory = {
  checkout: PromoCheckoutRow;
  codes: PromoCode[];
  redemptions: { codeId: string; userId: string; checkoutId: string; status: string }[];
  open: boolean;
  paidBefore: boolean;
  writes: { amountHalalas: number; promoCode: string | null }[];
};

function memoryDb(mem: Memory): PromoDb {
  const active = (codeId: string, except: string, userId?: string) =>
    mem.redemptions.filter(
      (row) =>
        row.codeId === codeId &&
        row.checkoutId !== except &&
        row.status !== "released" &&
        (userId ? row.userId === userId : true)
    );
  return {
    async loadCheckout() {
      return mem.checkout;
    },
    async loadCode(normalized) {
      return mem.codes.find((item) => item.code === normalized) || null;
    },
    async countUses(codeId, except) {
      return active(codeId, except).length;
    },
    async countUserUses(codeId, userId, except) {
      return active(codeId, except, userId).length;
    },
    async hasOpenSubscription() {
      return mem.open;
    },
    async hasPaidBefore() {
      return mem.paidBefore;
    },
    async releaseCheckout(checkoutId) {
      for (const row of mem.redemptions) {
        if (row.checkoutId === checkoutId && row.status === "reserved") row.status = "released";
      }
    },
    async reserve(input) {
      const uses = active(input.code.id, input.checkout.id);
      const userUses = active(input.code.id, input.checkout.id, input.checkout.userId);
      const max = input.code.singleUse ? 1 : input.code.maxUses;
      if (input.code.onePerUser && userUses.length > 0) return { ok: false, reason: "already_used" };
      if (max !== null && uses.length >= max) return { ok: false, reason: "max_uses" };
      mem.redemptions.push({
        codeId: input.code.id,
        userId: input.checkout.userId,
        checkoutId: input.checkout.id,
        status: "reserved",
      });
      return { ok: true };
    },
    async writeCheckout(_id, patch) {
      mem.writes.push({ amountHalalas: patch.amountHalalas, promoCode: patch.promoCode });
      mem.checkout = {
        ...mem.checkout,
        amountHalalas: patch.amountHalalas,
        listHalalas: patch.listAmountHalalas,
        promoCodeId: patch.promoCodeId,
      };
      return true;
    },
  };
}

describe("promo validation", () => {
  test("keeps the published list prices", () => {
    assert.equal(PLAN_AMOUNTS_SAR.engineer.month, 19);
    assert.equal(PLAN_AMOUNTS_SAR.professional.month, 41);
    assert.equal(PLAN_AMOUNTS_SAR.consultant.month, 99);
    assert.equal(PLAN_AMOUNTS_SAR.team.month, 449);
    assert.equal(PLAN_AMOUNTS_SAR.enterprise.month, 3900);
    assert.equal(quoteSelfServe("team", "month", 1).amountSar, 449 + 89);
    assert.equal(quoteSelfServe("enterprise", "year").amountSar, 39000);
  });

  test("applies 10 percent on the server and ignores a tampered amount", () => {
    const gift = code({ discountType: "percent", percentOff: 10 });
    const decision = evaluatePromo(gift, facts());
    assert.equal(decision.ok, true);
    if (!decision.ok) return;
    assert.equal(decision.chargedHalalas, 1710);
    assert.equal(decision.discountHalalas, 190);
    const priced = priceCheckout(1900, gift, 100);
    assert.equal(priced.moyasarAmount, 1710);
    assert.equal(priced.chargedHalalas, 1710);
  });

  test("prices a free first month as SAR 0 and a fixed discount that undershoots as invalid", () => {
    const free = evaluatePromo(code({ discountType: "free_months", freeMonths: 1, cycles: 1, intervals: ["month"] }), facts());
    assert.equal(free.ok && free.free && free.chargedHalalas, 0);
    assert.equal(canRedeemFree({ status: "pending", amountHalalas: 0, promoCodeId: "code-1" }), true);
    assert.equal(canRedeemFree({ status: "pending", amountHalalas: 1900, promoCodeId: "code-1" }), false);
    const tiny = evaluatePromo(code({ discountType: "fixed", amountOffSar: 18.5 }), facts());
    assert.equal(tiny.ok, false);
    if (!tiny.ok) assert.equal(tiny.reason, "below_minimum");
  });

  test("rejects reuse, expiry, the wrong plan, and the wrong account", () => {
    const gift = code({ discountType: "percent", percentOff: 10, plans: ["engineer"], audience: "lapsed" });
    assert.equal(evaluatePromo(gift, facts({ userUses: 1, hasPaidBefore: true })).ok, false);
    assert.equal((evaluatePromo(gift, facts({ userUses: 1, hasPaidBefore: true })) as { reason: string }).reason, "already_used");
    assert.equal(evaluatePromo(gift, facts({ hasPaidBefore: true, uses: 5 })).ok, true);
    const capped = code({ discountType: "percent", percentOff: 10, maxUses: 2 });
    assert.equal((evaluatePromo(capped, facts({ uses: 2 })) as { reason: string }).reason, "max_uses");
    const expired = code({ discountType: "percent", percentOff: 10, expiresAt: "2026-10-01T00:00:00.000Z" });
    assert.equal((evaluatePromo(expired, facts()) as { reason: string }).reason, "expired");
    const later = code({ discountType: "percent", percentOff: 10, startsAt: "2026-11-01T00:00:00.000Z" });
    assert.equal((evaluatePromo(later, facts()) as { reason: string }).reason, "not_started");
    const inactive = code({ discountType: "percent", percentOff: 10, active: false });
    assert.equal((evaluatePromo(inactive, facts()) as { reason: string }).reason, "inactive");
    assert.equal((evaluatePromo(gift, facts({ planId: "professional", hasPaidBefore: true })) as { reason: string }).reason, "wrong_plan");
    assert.equal((evaluatePromo(gift, facts({ hasOpenSubscription: true, hasPaidBefore: true })) as { reason: string }).reason, "not_lapsed");
    assert.equal((evaluatePromo(gift, facts()) as { reason: string }).reason, "not_lapsed");
    const mine = code({ discountType: "percent", percentOff: 10, restrictedUserId: "user-2" });
    assert.equal((evaluatePromo(mine, facts()) as { reason: string }).reason, "wrong_user");
    const edu = code({ discountType: "percent", percentOff: 50, audience: "domain", domains: [".edu.sa"] });
    assert.equal(evaluatePromo(edu, facts({ email: "a@student.ksu.edu.sa" })).ok, true);
    assert.equal((evaluatePromo(edu, facts({ email: "a@gmail.com" })) as { reason: string }).reason, "wrong_domain");
    assert.equal((evaluatePromo(edu, facts({ email: "a@edu.sa.evil.com" })) as { reason: string }).reason, "wrong_domain");
  });

  test("matches university domains without matching a lookalike host", () => {
    assert.equal(emailMatchesDomain("student@ksu.edu.sa", [".edu.sa"]), true);
    assert.equal(emailMatchesDomain("student@dept.ksu.edu.sa", ["ksu.edu.sa"]), true);
    assert.equal(emailMatchesDomain("student@edu.sa.evil.com", [".edu.sa"]), false);
    assert.equal(emailMatchesDomain("not-an-email", [".edu.sa"]), false);
    assert.equal(normalizePromoCode(" stu_edu "), "STU-EDU");
  });

  test("returns renewal to the list price after the discounted cycles", () => {
    const state = { cyclesRemaining: 2, discountType: "percent" as const, percentOff: 10, amountOffSar: null };
    const first = priceRenewalWithPromo(19, state);
    assert.equal(first.amountHalalas, 1710);
    assert.equal(first.cyclesRemainingAfter, 1);
    const second = priceRenewalWithPromo(19, { ...state, cyclesRemaining: first.cyclesRemainingAfter });
    assert.equal(second.amountHalalas, 1710);
    assert.equal(second.cyclesRemainingAfter, 0);
    const third = priceRenewalWithPromo(19, { ...state, cyclesRemaining: second.cyclesRemainingAfter });
    assert.equal(third.amountHalalas, 1900);
    assert.equal(third.discounted, false);
    const listOnly = priceRenewalWithPromo(PLAN_AMOUNTS_SAR.professional.month, {
      cyclesRemaining: 0,
      discountType: null,
      percentOff: null,
      amountOffSar: null,
    });
    assert.equal(listOnly.amountHalalas, 4100);
  });
});

describe("checkout promo application", () => {
  test("stores the discounted amount, blocks a second use, and charges Moyasar that amount", async () => {
    const gift = code({ discountType: "percent", percentOff: 10, code: "WEEK10" });
    const mem: Memory = {
      checkout: {
        id: "11111111-1111-4111-8111-111111111111",
        userId: "user-1",
        email: "nora@example.com",
        plan: "engineer",
        interval: "month",
        status: "pending",
        amountHalalas: 1900,
        listHalalas: null,
        promoCodeId: null,
      },
      codes: [gift],
      redemptions: [],
      open: false,
      paidBefore: false,
      writes: [],
    };
    const applied = await applyPromo(memoryDb(mem), {
      checkoutId: mem.checkout.id,
      rawCode: "week10",
      userId: "user-1",
      clientAmountHalalas: 100,
      now: NOW,
    });
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    assert.equal(applied.chargedHalalas, 1710);
    assert.equal(mem.writes.at(-1)?.amountHalalas, 1710);
    assert.equal(mem.writes.at(-1)?.promoCode, "WEEK10");

    mem.redemptions[0].status = "paid";
    mem.checkout = { ...mem.checkout, id: "22222222-2222-4222-8222-222222222222", amountHalalas: 1900, promoCodeId: null, listHalalas: null };
    const reuse = await applyPromo(memoryDb(mem), {
      checkoutId: mem.checkout.id,
      rawCode: "WEEK10",
      userId: "user-1",
      now: NOW,
    });
    assert.equal(reuse.ok, false);
    if (!reuse.ok) assert.equal(reuse.reason, "already_used");

    const calls: { amount?: number }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as { amount?: number };
      calls.push(body);
      assert.match(String(url), /api\.moyasar\.com/);
      return new Response(JSON.stringify({ id: "pay_test", status: "paid", amount: body.amount, currency: "SAR" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      const payment = await createMoyasarTokenPayment("sk_test_promo", {
        amount: applied.chargedHalalas,
        currency: "SAR",
        description: "engineerit.ai Engineer plan",
        callback_url: "http://127.0.0.1:3000/api/payments/moyasar/callback",
        token: "token_test",
        idempotencyKey: "promo-test",
        metadata: { checkout_id: mem.checkout.id },
      });
      assert.equal(calls[0]?.amount, 1710);
      assert.equal(payment.amount, 1710);
      assert.equal(assessPaidInvoice(1710, { status: "paid", amount: 1900, currency: "SAR" }).ok, false);
      assert.equal(assessPaidInvoice(1710, { status: "paid", amount: 1710, currency: "SAR" }).ok, true);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("rejects the wrong user and an exhausted single-use code", async () => {
    const gift = code({ discountType: "free_months", freeMonths: 1, singleUse: true, maxUses: 1, intervals: ["month"] });
    const mem: Memory = {
      checkout: {
        id: "33333333-3333-4333-8333-333333333333",
        userId: "user-1",
        email: "student@ksu.edu.sa",
        plan: "engineer",
        interval: "month",
        status: "pending",
        amountHalalas: 1900,
        listHalalas: null,
        promoCodeId: null,
      },
      codes: [gift],
      redemptions: [{ codeId: gift.id, userId: "user-9", checkoutId: "other", status: "paid" }],
      open: false,
      paidBefore: false,
      writes: [],
    };
    const wrongUser = await applyPromo(memoryDb(mem), {
      checkoutId: mem.checkout.id,
      rawCode: gift.code,
      userId: "someone-else",
      now: NOW,
    });
    assert.equal(wrongUser.ok, false);
    if (!wrongUser.ok) assert.equal(wrongUser.reason, "wrong_user");
    const exhausted = await applyPromo(memoryDb(mem), {
      checkoutId: mem.checkout.id,
      rawCode: gift.code,
      userId: "user-1",
      now: NOW,
    });
    assert.equal(exhausted.ok, false);
    if (!exhausted.ok) assert.equal(exhausted.reason, "max_uses");
    assert.equal(mem.writes.length, 0);
  });
});

describe("question of the week and owner tools", () => {
  const question: WeeklyQuestionRow = {
    id: "q-1",
    question_en: "What does a P&ID show?",
    question_ar: "ماذا يوضح مخطط الأنابيب والأجهزة؟",
    choices_en: ["Flow only", "Piping and instruments", "A price list"],
    choices_ar: ["التدفق فقط", "الأنابيب والأجهزة", "قائمة أسعار"],
    answer_index: 1,
    reward_percent: 10,
    participation_only: false,
    valid_days: 7,
    active: true,
    published_at: "2026-10-20T00:00:00.000Z",
  };

  test("hides the answer and issues one 10 percent code", () => {
    const pub = publicWeeklyQuestion(question, NOW);
    assert.ok(pub);
    assert.equal(Object.prototype.hasOwnProperty.call(pub, "answer_index"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(pub, "answerIndex"), false);
    assert.equal(JSON.stringify(pub).includes("answer"), false);
    const correct = gradeWeeklyAnswer(question, 1);
    assert.equal(correct.rewarded, true);
    const wrong = gradeWeeklyAnswer(question, 0);
    assert.equal(wrong.rewarded, false);
    assert.equal(wrong.correct, false);
    const first = decideQuestionAttempt(null, correct);
    assert.equal(first.ok && first.rewarded, true);
    const again = decideQuestionAttempt(
      { rewarded: false, correct: false, code: null, expiresAt: null },
      gradeWeeklyAnswer(question, 1)
    );
    assert.equal(again.ok && again.already && again.rewarded, false);
    const open = { ...question, participation_only: true };
    assert.equal(gradeWeeklyAnswer(open, 0).rewarded, true);
    const reward = buildRewardCode({ userId: "user-1", percent: 10, validDays: 7, questionId: question.id, now: NOW });
    assert.equal(reward.percent_off, 10);
    assert.equal(reward.cycles, 1);
    assert.equal(reward.restricted_user_id, "user-1");
    assert.equal(reward.max_uses, 1);
    const expires = new Date(reward.expires_at).getTime() - NOW.getTime();
    assert.equal(expires, 7 * 24 * 60 * 60 * 1000);
  });

  test("generates a unique student batch and refuses a zero percent code", () => {
    const batch = buildBatchCodes({
      count: 20,
      prefix: "STU",
      now: NOW,
      draft: {
        discountType: "free_months",
        freeMonths: 1,
        cycles: 1,
        plans: ["engineer"],
        intervals: ["month"],
        domains: [".edu.sa"],
      },
    });
    assert.equal(batch.ok, true);
    if (!batch.ok) return;
    assert.equal(new Set(batch.rows.map((row) => row.code)).size, 20);
    assert.equal(batch.rows.every((row) => row.single_use && row.max_uses === 1 && row.domains.includes(".edu.sa")), true);
    const bad = parsePromoDraft({ discountType: "percent", percentOff: 0 });
    assert.equal(bad.ok, false);
  });

  test("locks codes and answers behind service-role grants and RLS", () => {
    const sql = readFileSync("supabase/migrations/20261023170000_promo_codes.sql", "utf8");
    for (const table of ["promo_codes", "promo_redemptions", "weekly_questions", "question_entries"]) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from authenticated`));
      assert.match(sql, new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`));
    }
    assert.equal(/create policy/i.test(sql), false);
    assert.match(sql, /answer_index/);
    assert.match(sql, /grant execute on function public\.reserve_promo_use/);
    const renewal = readFileSync("lib/renewals.ts", "utf8");
    assert.match(renewal, /priceRenewalWithPromo/);
    assert.match(renewal, /missingPromoSchema/);
    assert.match(renewal, /promoRenewalUpdate/);
    assert.match(readFileSync("lib/settlePayment.ts", "utf8"), /missingPromoSchema/);
    assert.match(readFileSync("lib/settlePayment.ts", "utf8"), /"promo_code_id" in row/);
    assert.match(readFileSync("app/api/question/route.ts", "utf8"), /missingPromoSchema/);
    assert.match(readFileSync("app/api/checkout/promo/route.ts", "utf8"), /unavailable/);
    assert.match(readFileSync("app/api/admin/codes/route.ts", "utf8"), /unavailable/);
    const checkout = readFileSync("app/checkout/[id]/page.tsx", "utf8");
    assert.match(checkout, /CheckoutCode/);
    assert.match(readFileSync("lib/shell.ts", "utf8"), /Have a code\?/);
    assert.match(readFileSync("lib/shell.ts", "utf8"), /عندك رمز؟/);
  });

  test("skips promo writes when the migration is not applied", () => {
    assert.equal(
      missingPromoSchema({
        code: "PGRST205",
        message: "Could not find the table 'public.promo_codes' in the schema cache",
      }),
      true
    );
    assert.equal(
      missingPromoSchema({
        code: "42703",
        message: 'column "list_amount_halalas" of relation "moyasar_invoices" does not exist',
      }),
      true
    );
    assert.equal(
      missingPromoSchema("Could not find the 'promo_code_id' column of 'moyasar_invoices' in the schema cache"),
      true
    );
    assert.equal(missingPromoSchema("relation \"public.weekly_questions\" does not exist"), true);
    assert.equal(missingPromoSchema({ code: "23505", message: "duplicate key value violates unique constraint" }), false);
    assert.equal(missingPromoSchema("permission denied for table profiles"), false);
    assert.deepEqual(promoRenewalUpdate({}, 0), {});
    assert.deepEqual(promoRenewalUpdate({ promo_cycles_remaining: 0, promo_discount_type: null }, 0), {});
    assert.deepEqual(promoRenewalUpdate({ promo_cycles_remaining: 2, promo_discount_type: "percent" }, 1), {
      promo_cycles_remaining: 1,
    });
    const cleared = promoRenewalUpdate({ promo_cycles_remaining: 1, promo_discount_type: "percent" }, 0);
    assert.equal(cleared.promo_cycles_remaining, 0);
    assert.equal(cleared.promo_code_id, null);
  });
});
