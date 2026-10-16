import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminEmail } from "../lib/admin";
import { pickEffectivePlan, teamGrantsAccess } from "../lib/effectivePlan";
import {
  AI_ADVISORS_FEATURE,
  ENTERPRISE_FROM_SAR,
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
    assert.equal(planPriceLabel("enterprise", "year").primary, "From SAR 25,000 / year");

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
