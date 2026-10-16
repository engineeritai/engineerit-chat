import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminEmail } from "../lib/admin";
import { pickEffectivePlan, teamGrantsAccess } from "../lib/effectivePlan";
import {
  afterChargeFailure,
  decideRenewal,
  prorateSeatChange,
  renewalChargeHalalas,
  seatChangeIdempotencyKey,
  vatFromInclusive,
  zatcaInvoicesEnabled,
} from "../lib/billingCycle";
import {
  AI_ADVISORS_FEATURE,
  ENTERPRISE_EXTRA_SEAT_SAR,
  ENTERPRISE_FROM_SAR,
  ENTERPRISE_INCLUDED_SEATS,
  EXTRA_SEAT_SAR,
  PLANS,
  PLAN_AMOUNTS_SAR,
  featureTier,
  quoteSelfServe,
} from "../lib/plans";
import {
  assertIndividualPlanPrices,
  displayFeatures,
  formatUsdApprox,
  planPriceLabel,
} from "../lib/pricingDisplay";
import { safeNextPath } from "../lib/safeNext";
import {
  assessPaidInvoice,
  extractInvoiceId,
  verifyMoyasarSecretToken,
  verifyMoyasarSignature,
} from "../lib/moyasar";
import { buildReceipt } from "../lib/receipt";
import crypto from "node:crypto";

describe("self-serve prices", () => {
  it("keeps individual monthly prices and bills annual at 10×", () => {
    for (const plan of ["engineer", "professional", "consultant", "team"] as const) {
      const month = quoteSelfServe(plan, "month");
      const year = quoteSelfServe(plan, "year");
      assert.equal(month.amountSar, PLAN_AMOUNTS_SAR[plan].month);
      assert.equal(year.amountSar, PLAN_AMOUNTS_SAR[plan].year);
      assert.equal(year.amountSar, month.amountSar * 10);
      assert.equal(month.amountHalalas, month.amountSar * 100);
    }
  });

  it("prices the Team plan at SAR 349 / 3,490 with 5 seats and SAR 69 extra seats", () => {
    const month = quoteSelfServe("team", "month", 0);
    const year = quoteSelfServe("team", "year", 2);
    assert.equal(month.amountSar, 349);
    assert.equal(month.seatLimit, 5);
    assert.equal(year.amountSar, 3490 + 2 * 690);
    assert.equal(year.seatLimit, 7);
    assert.equal(EXTRA_SEAT_SAR.year, EXTRA_SEAT_SAR.month * 10);
    assert.equal(quoteSelfServe("engineer", "month", 4).extraSeats, 0);
  });

  it("lists Enterprise from SAR 2,500 / month, 10× annually", () => {
    assert.equal(ENTERPRISE_FROM_SAR.month, 2500);
    assert.equal(ENTERPRISE_FROM_SAR.year, 25000);
  });

  it("shows the same names, SAR prices, USD, features, and annual prices", () => {
    assertIndividualPlanPrices();
    assert.equal(formatUsdApprox(19), "USD 5.07");
    assert.equal(formatUsdApprox(349), "USD 93.07");
    assert.equal(formatUsdApprox(2500), "USD 666.67");
    assert.equal(planPriceLabel("consultant", "year").amountSar, 790);
    assert.equal(planPriceLabel("consultant", "year").primary, "SAR 790 / year");
    assert.equal(planPriceLabel("team", "year", 1).amountSar, 3490 + 690);
    assert.equal(planPriceLabel("enterprise", "year").primary, "SAR 25,000 / year");
    assert.equal(planPriceLabel("enterprise", "month", 2).amountSar, 2500 + 2 * 199);

    for (const id of ["consultant", "team", "enterprise"] as const) {
      const plan = PLANS.find((item) => item.id === id);
      assert.ok(plan);
      assert.ok(plan.features.length > 0);
      assert.ok(plan.features.includes(AI_ADVISORS_FEATURE));
      assert.equal(displayFeatures(plan, "month").includes(AI_ADVISORS_FEATURE), true);
    }

    const consultant = PLANS.find((item) => item.id === "consultant");
    assert.ok(consultant);
    assert.ok(consultant.features.includes("Equipment list & BOQ analysis"));
    assert.equal(
      consultant.features.some((feature) => /bank transfer|mailto|not charged/i.test(feature)),
      false
    );
  });
});

describe("team access", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it("gives Consultant features to an active team and enterprise seat", () => {
    assert.equal(featureTier("team"), "consultant");
    assert.equal(featureTier("enterprise"), "consultant");
    assert.equal(featureTier("engineer"), "engineer");
    assert.equal(
      pickEffectivePlan("assistant", [{ plan: "team", status: "active", current_period_end: future }]),
      "team"
    );
    assert.equal(
      pickEffectivePlan("professional", [
        { plan: "enterprise", status: "active", current_period_end: future },
      ]),
      "enterprise"
    );
  });

  it("drops the whole team when the subscription lapses and keeps a personal plan", () => {
    assert.equal(teamGrantsAccess({ plan: "team", status: "active", current_period_end: past }), false);
    assert.equal(
      pickEffectivePlan("professional", [{ plan: "team", status: "active", current_period_end: past }]),
      "professional"
    );
    assert.equal(
      pickEffectivePlan("team", [{ plan: "team", status: "active", current_period_end: past }]),
      "assistant"
    );
    assert.equal(
      pickEffectivePlan("consultant", [{ plan: "team", status: "canceled", current_period_end: future }]),
      "consultant"
    );
  });
});

describe("Moyasar confirmation and receipts", () => {
  it("accepts a paid invoice only when the amount matches", () => {
    assert.deepEqual(assessPaidInvoice(34900, { status: "paid", amount: 34900 }), { ok: true });
    assert.equal(assessPaidInvoice(34900, { status: "initiated", amount: 34900 }).ok, false);
    assert.equal(assessPaidInvoice(34900, { status: "paid", amount: 100 }).reason, "amount_mismatch");
  });

  it("reads the invoice id from an invoice callback and from a payment webhook", () => {
    assert.equal(extractInvoiceId({ id: "inv_1", status: "paid", amount: 100 }), "inv_1");
    assert.equal(
      extractInvoiceId({ type: "payment_paid", secret_token: "s", data: { id: "pay_1", invoice_id: "inv_9" } }),
      "inv_9"
    );
    assert.equal(extractInvoiceId({ type: "payment_paid", data: { id: "pay_1" } }), null);
  });

  it("checks the webhook signature and secret token", () => {
    const raw = JSON.stringify({ id: "inv_1", status: "paid" });
    const signature = crypto.createHmac("sha256", "whsec").update(raw).digest("hex");
    assert.equal(verifyMoyasarSignature(raw, signature, "whsec"), true);
    assert.equal(verifyMoyasarSignature(raw, signature, "other"), false);
    assert.equal(verifyMoyasarSecretToken("whsec", "whsec"), true);
    assert.equal(verifyMoyasarSecretToken("nope", "whsec"), false);
  });

  it("builds a VAT-inclusive receipt with plan, amount, and period", () => {
    const receipt = buildReceipt({
      plan: "enterprise",
      amountSar: 4800,
      interval: "year",
      seats: 12,
      periodEnd: "2027-10-16T00:00:00.000Z",
    });
    assert.match(receipt.subject, /Enterprise/);
    assert.match(receipt.subject, /4,800/);
    assert.match(receipt.text, /This amount is VAT inclusive/);
    assert.match(receipt.text, /Period: Annual/);
    assert.match(receipt.text, /Seats: 12/);
    assert.match(receipt.html, /VAT inclusive/);
    assert.match(receipt.text, /Net: SAR/);
    assert.match(receipt.text, /VAT 15%/);
    assert.match(receipt.text, /ZATCA tax invoice: not issued yet/);
  });
});

describe("renewals, cancellation, and seat changes", () => {
  const periodEnd = new Date("2026-11-16T00:00:00.000Z");
  const base = {
    subscriptionId: "sub_1",
    periodEnd,
    status: "active" as const,
    cancelAtPeriodEnd: false,
    failureCount: 0,
  };

  it("prices Enterprise at SAR 2,500 for 10 seats, plus SAR 199 per extra seat", () => {
    const month = quoteSelfServe("enterprise", "month", 0);
    const year = quoteSelfServe("enterprise", "year", 2);
    assert.equal(ENTERPRISE_INCLUDED_SEATS, 10);
    assert.equal(month.amountSar, 2500);
    assert.equal(month.seatLimit, 10);
    assert.equal(year.amountSar, 25000 + 2 * ENTERPRISE_EXTRA_SEAT_SAR.year);
    assert.equal(year.seatLimit, 12);
    assert.equal(ENTERPRISE_EXTRA_SEAT_SAR.year, ENTERPRISE_EXTRA_SEAT_SAR.month * 10);
  });

  it("charges on the renewal date and retries on day 1, 3, and 7", () => {
    assert.equal(
      decideRenewal({ ...base, now: new Date("2026-11-15T00:00:00.000Z") }).action,
      "skip"
    );
    const first = decideRenewal({ ...base, now: periodEnd });
    assert.equal(first.action, "charge");
    if (first.action === "charge") {
      assert.equal(first.attempt, 0);
      assert.equal(first.idempotencyKey, "renewal:sub_1:2026-11-16T00:00:00.000Z:0");
    }

    assert.equal(
      decideRenewal({
        ...base,
        now: new Date("2026-11-16T12:00:00.000Z"),
        failureCount: 1,
        status: "past_due",
      }).action,
      "wait"
    );

    const day1 = decideRenewal({
      ...base,
      now: new Date("2026-11-17T00:00:00.000Z"),
      failureCount: 1,
      status: "past_due",
    });
    const day3 = decideRenewal({
      ...base,
      now: new Date("2026-11-19T00:00:00.000Z"),
      failureCount: 2,
      status: "past_due",
    });
    const day7 = decideRenewal({
      ...base,
      now: new Date("2026-11-23T00:00:00.000Z"),
      failureCount: 3,
      status: "past_due",
    });
    assert.equal(day1.action, "charge");
    assert.equal(day3.action, "charge");
    assert.equal(day7.action, "charge");
    if (day1.action === "charge") assert.equal(day1.attempt, 1);
    if (day3.action === "charge") assert.equal(day3.attempt, 2);
    if (day7.action === "charge") assert.equal(day7.attempt, 3);
  });

  it("downgrades after the day-7 failure and expires a cancellation without charging", () => {
    assert.equal(
      decideRenewal({
        ...base,
        now: new Date("2026-11-24T00:00:00.000Z"),
        failureCount: 4,
        status: "past_due",
      }).action,
      "downgrade"
    );
    assert.deepEqual(afterChargeFailure(3), { status: "downgrade", failureCount: 4 });
    const firstRetry = afterChargeFailure(0);
    const secondRetry = afterChargeFailure(1);
    const thirdRetry = afterChargeFailure(2);
    assert.equal(firstRetry.status, "past_due");
    assert.equal(secondRetry.status, "past_due");
    assert.equal(thirdRetry.status, "past_due");
    if (firstRetry.status === "past_due") assert.equal(firstRetry.retryDay, 1);
    if (secondRetry.status === "past_due") assert.equal(secondRetry.retryDay, 3);
    if (thirdRetry.status === "past_due") assert.equal(thirdRetry.retryDay, 7);

    assert.equal(
      decideRenewal({
        ...base,
        now: new Date("2026-11-15T00:00:00.000Z"),
        cancelAtPeriodEnd: true,
      }).action,
      "skip"
    );
    assert.equal(
      decideRenewal({ ...base, now: periodEnd, cancelAtPeriodEnd: true }).action,
      "expire"
    );
  });

  it("prorates seat changes, credits removals, and keeps a stable idempotency key", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    const end = new Date("2026-10-31T00:00:00.000Z");
    const halfway = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    const added = prorateSeatChange({
      now: halfway,
      periodStart: start,
      periodEnd: end,
      pricePerSeatSar: 69,
      fromExtra: 0,
      toExtra: 1,
    });
    assert.equal(added.amountHalalas, 3450);
    assert.equal(added.creditHalalas, 0);

    const tiny = prorateSeatChange({
      now: new Date(end.getTime() - 60 * 60 * 1000),
      periodStart: start,
      periodEnd: end,
      pricePerSeatSar: 69,
      fromExtra: 0,
      toExtra: 1,
    });
    assert.ok(tiny.amountHalalas === 100);

    const removed = prorateSeatChange({
      now: halfway,
      periodStart: start,
      periodEnd: end,
      pricePerSeatSar: 69,
      fromExtra: 1,
      toExtra: 0,
    });
    assert.equal(removed.amountHalalas, -3450);
    assert.equal(removed.creditHalalas, 3450);
    assert.deepEqual(renewalChargeHalalas(34900, 3450), {
      chargeHalalas: 31450,
      creditUsed: 3450,
      creditRemaining: 0,
    });
    assert.equal(
      seatChangeIdempotencyKey("sub", "2026-11-16T00:00:00.000Z", 0, 2),
      "seats:sub:2026-11-16T00:00:00.000Z:0->2"
    );
  });

  it("splits an inclusive amount into net and 15% VAT", () => {
    const vat = vatFromInclusive(2500);
    assert.equal(vat.gross, 2500);
    assert.equal(Math.round((vat.net + vat.vat) * 100), 250000);
    assert.equal(zatcaInvoicesEnabled(undefined), false);
    assert.equal(zatcaInvoicesEnabled("1"), true);
  });
});

describe("admin and redirects", () => {
  it("matches admin emails only from the configured list", () => {
    assert.equal(isAdminEmail("a@example.com", ""), false);
    assert.equal(isAdminEmail("A@Example.com", "a@example.com, other@example.com"), true);
    assert.equal(isAdminEmail("nope@example.com", "a@example.com"), false);
  });

  it("rejects off-site return paths", () => {
    assert.equal(safeNextPath("/team/join?token=abc"), "/team/join?token=abc");
    assert.equal(safeNextPath("https://evil.example"), "/profile");
    assert.equal(safeNextPath("//evil.example"), "/profile");
  });
});
