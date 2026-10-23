import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assessPaidInvoice, createMoyasarTokenPayment } from "../lib/moyasar";
import {
  ENTERPRISE_FROM_SAR,
  EXTRA_SEAT_SAR,
  PLAN_AMOUNTS_SAR,
  quoteSelfServe,
} from "../lib/plans";
import { buildInvoiceDocument } from "../lib/invoiceDocument";
import { promoCopy } from "../lib/promoCopy";
import {
  canActivateFree,
  cycleCharge,
  emailMatchesDomains,
  evaluatePromo,
  listPricesUnchanged,
  payableIsChargeable,
  pricedCheckout,
  priceWithPromo,
  questionShareLinks,
  validatePromoDraft,
  type PromoContext,
  type StoredPromo,
} from "../lib/promoCodes";

const NOW = new Date("2026-10-23T12:00:00.000Z");

function promo(overrides: Partial<StoredPromo> = {}): StoredPromo {
  return {
    id: "code-1",
    code: "STUDENT10",
    status: "active",
    kind: "percent",
    percentOff: 10,
    amountOffSar: null,
    freeMonths: null,
    plans: ["engineer"],
    intervals: ["month"],
    cycleCount: 1,
    startsAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    maxUses: 100,
    onePerUser: true,
    audience: "email_domain",
    emailDomains: [".edu.sa"],
    restrictedUserId: null,
    ...overrides,
  };
}

function context(overrides: Partial<PromoContext> = {}): PromoContext {
  return {
    userId: "user-1",
    email: "student@ksu.edu.sa",
    plan: "engineer",
    interval: "month",
    now: NOW,
    lapsed: false,
    redeemedByUser: false,
    otherUses: 0,
    ...overrides,
  };
}

describe("promo codes", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("keeps the published list prices", () => {
    assert.equal(listPricesUnchanged(), true);
    assert.equal(PLAN_AMOUNTS_SAR.engineer.month, 19);
    assert.equal(PLAN_AMOUNTS_SAR.professional.month, 41);
    assert.equal(PLAN_AMOUNTS_SAR.consultant.month, 99);
    assert.equal(PLAN_AMOUNTS_SAR.team.month, 449);
    assert.equal(EXTRA_SEAT_SAR.month, 89);
    assert.equal(ENTERPRISE_FROM_SAR.month, 3900);
    assert.equal(quoteSelfServe("engineer", "month").amountHalalas, 1900);
    assert.equal(quoteSelfServe("team", "month", 1).amountSar, 449 + 89);
  });

  it("prices percent, fixed, and free months in halalas", () => {
    const percent = priceWithPromo(1900, { kind: "percent", percentOff: 10, amountOffSar: null, freeMonths: null });
    assert.equal(percent.discountHalalas, 190);
    assert.equal(percent.payableHalalas, 1710);
    assert.equal(percent.free, false);

    const fixed = priceWithPromo(4100, { kind: "fixed", percentOff: null, amountOffSar: 10, freeMonths: null });
    assert.equal(fixed.payableHalalas, 3100);

    const free = priceWithPromo(1900, { kind: "free_months", percentOff: null, amountOffSar: null, freeMonths: 1 });
    assert.equal(free.payableHalalas, 0);
    assert.equal(free.free, true);

    const seated = priceWithPromo((449 + 89) * 100, {
      kind: "percent",
      percentOff: 10,
      amountOffSar: null,
      freeMonths: null,
    });
    assert.equal(seated.payableHalalas, 48420);
  });

  it("ignores a tampered client amount and rejects a mismatched Moyasar charge", async () => {
    const terms = { kind: "percent" as const, percentOff: 10, amountOffSar: null, freeMonths: null };
    const priced = pricedCheckout({ listHalalas: 1900, claimedHalalas: 100, terms });
    assert.equal(priced.payableHalalas, 1710);
    assert.notEqual(priced.payableHalalas, priced.claimedHalalas);
    assert.equal(assessPaidInvoice(priced.payableHalalas, { status: "paid", amount: 1900 }).reason, "amount_mismatch");
    assert.equal(assessPaidInvoice(priced.payableHalalas, { status: "paid", amount: 100 }).ok, false);
    assert.equal(assessPaidInvoice(priced.payableHalalas, { status: "paid", amount: 1710 }).ok, true);

    let charged = 0;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.match(url, /^https:\/\/api\.moyasar\.com\/v1\/payments$/);
      const body = JSON.parse(String(init?.body));
      charged = body.amount;
      assert.equal(body.currency, "SAR");
      return new Response(JSON.stringify({ id: "pay_test", status: "paid", amount: body.amount }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const payment = await createMoyasarTokenPayment("sk_test_only", {
      amount: priced.payableHalalas,
      currency: "SAR",
      description: "engineerit.ai Engineer plan",
      callback_url: "http://127.0.0.1:3000/api/payments/moyasar/callback",
      token: "token_test",
      metadata: { checkout_id: "checkout-1" },
      idempotencyKey: "promo-test-1",
    });
    assert.equal(charged, 1710);
    assert.equal(payment.amount, 1710);
    assert.equal(canActivateFree(1710, "code-1"), false);
    assert.equal(canActivateFree(0, "code-1"), true);
    assert.equal(canActivateFree(0, null), false);
  });

  it("rejects reuse, expiry, the wrong plan, and the wrong account", () => {
    const reason = (overrides: Partial<StoredPromo> | null, ctx: Partial<PromoContext> = {}) => {
      const result = evaluatePromo(overrides === null ? null : promo(overrides), context(ctx));
      return result.ok ? "ok" : result.reason;
    };
    assert.equal(reason({}), "ok");
    assert.equal(reason({}, { redeemedByUser: true }), "already_used");
    assert.equal(reason({ expiresAt: "2026-10-01T00:00:00.000Z" }), "expired");
    assert.equal(reason({ startsAt: "2026-11-01T00:00:00.000Z" }), "not_started");
    assert.equal(reason({ status: "disabled" }), "disabled");
    assert.equal(reason({}, { plan: "consultant" }), "wrong_plan");
    assert.equal(reason({}, { interval: "year" }), "wrong_interval");
    assert.equal(reason({}, { email: "person@gmail.com" }), "wrong_domain");
    assert.equal(reason({ audience: "user", restrictedUserId: "user-2" }), "wrong_user");
    assert.equal(reason({ audience: "lapsed" }, { lapsed: false }), "not_lapsed");
    assert.equal(reason({ audience: "lapsed", emailDomains: [] }, { lapsed: true }), "ok");
    assert.equal(reason({ maxUses: 1 }, { otherUses: 1 }), "maxed");
    assert.equal(reason(null), "not_found");
  });

  it("matches university domains and returns to the list price after the discounted cycles", () => {
    assert.equal(emailMatchesDomains("student@ksu.edu.sa", [".edu.sa"]), true);
    assert.equal(emailMatchesDomains("student@ksu.edu.sa", ["ksu.edu.sa"]), true);
    assert.equal(emailMatchesDomains("student@gmail.com", [".edu.sa"]), false);
    assert.equal(emailMatchesDomains("not-an-email", [".edu.sa"]), false);

    const terms = { kind: "percent" as const, percentOff: 10, amountOffSar: null, freeMonths: null };
    const first = cycleCharge(1900, 1, terms);
    assert.equal(first.chargeHalalas, 1710);
    assert.equal(first.upcomingHalalas, 1900);
    assert.equal(first.cyclesRemainingAfter, 0);
    const later = cycleCharge(1900, first.cyclesRemainingAfter, terms);
    assert.equal(later.chargeHalalas, 1900);
    assert.equal(later.discounted, false);

    const two = cycleCharge(1900, 2, terms);
    assert.equal(two.upcomingHalalas, 1710);
    assert.equal(two.cyclesRemainingAfter, 1);

    const free = cycleCharge(1900, 1, { kind: "free_months", percentOff: null, amountOffSar: null, freeMonths: 1 });
    assert.equal(free.chargeHalalas, 0);
    assert.equal(free.upcomingHalalas, 1900);
    assert.equal(payableIsChargeable(19), false);
    assert.equal(payableIsChargeable(0), true);
  });

  it("records the code on the invoice and speaks the checkout field in both languages", () => {
    const document = buildInvoiceDocument({
      plan: "engineer",
      amountSar: 17.1,
      interval: "month",
      locale: "en",
      promoCode: "STUDENT10",
      listAmountSar: 19,
      discountSar: 1.9,
    });
    const lines = document.rows.map((row) => `${row.label}: ${row.value}`).join("\n");
    assert.match(lines, /STUDENT10/);
    assert.match(lines, /List price/);
    assert.match(lines, /Discount/);

    const arabic = buildInvoiceDocument({
      plan: "engineer",
      amountSar: 0,
      interval: "month",
      locale: "ar",
      promoCode: "GIFT",
      listAmountSar: 19,
      discountSar: 19,
      paymentMethod: "promo",
    });
    assert.match(arabic.rows.map((row) => row.label).join("\n"), /الخصم/);
    assert.match(arabic.rows.map((row) => row.value).join("\n"), /GIFT/);

    assert.equal(promoCopy.en.haveCode, "Have a code?");
    assert.equal(promoCopy.ar.haveCode, "عندك رمز؟");
    assert.match(promoCopy.en.renewOnce, /list price/);
    assert.match(promoCopy.ar.renewOnce, /السعر المعلن/);
    const checkout = readFileSync("app/checkout/[id]/page.tsx", "utf8");
    assert.match(checkout, /PromoCodeBox/);
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /max-width: 420px/);
    const shares = questionShareLinks("https://engineerit.ai/question", "Question of the week");
    assert.match(shares.x, /twitter\.com\/intent\/tweet/);
    assert.match(shares.linkedin, /linkedin\.com\/sharing/);
    assert.match(shares.x, /engineerit\.ai%2Fquestion/);
  });

  it("locks codes and answers behind service role grants", () => {
    const sql = readFileSync("supabase/migrations/20261023153000_promo_codes.sql", "utf8");
    for (const table of [
      "promo_codes",
      "promo_redemptions",
      "weekly_questions",
      "weekly_question_answers",
      "weekly_question_attempts",
    ]) {
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
      assert.match(sql, new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`));
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    }
    assert.doesNotMatch(sql, /create policy/i);
    assert.match(sql, /reserve_promo_code/);
    assert.match(sql, /grant execute on function public\.reserve_promo_code\(uuid, uuid, uuid, text\) to service_role/);
    assert.match(sql, /amount_halalas >= 0/);
  });

  it("accepts a student gift and a lapsed win-back draft", () => {
    const student = validatePromoDraft({
      code: "student-edu",
      kind: "free_months",
      freeMonths: 1,
      plans: ["engineer"],
      intervals: ["month"],
      audience: "email_domain",
      emailDomains: [".edu.sa"],
      cycleCount: 3,
    });
    assert.equal(student.ok, true);
    if (student.ok) {
      assert.equal(student.value.code, "STUDENT-EDU");
      assert.equal(student.value.cycleCount, 1);
      assert.deepEqual(student.value.intervals, ["month"]);
    }
    const winback = validatePromoDraft({
      code: "welcome-back",
      kind: "percent",
      percentOff: 10,
      plans: ["engineer", "professional"],
      intervals: ["month", "year"],
      audience: "lapsed",
      cycleCount: 1,
    });
    assert.equal(winback.ok, true);
    const tiny = validatePromoDraft({
      code: "tiny-off",
      kind: "percent",
      percentOff: 99,
      plans: ["engineer"],
      intervals: ["month"],
    });
    assert.equal(tiny.ok, false);
  });
});
