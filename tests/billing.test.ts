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
  ADVISOR_FEATURE_BY_PLAN,
  CONSULTANT_LEGACY_SAR,
  ENTERPRISE_EXTRA_SEAT_SAR,
  ENTERPRISE_FROM_SAR,
  ENTERPRISE_INCLUDED_SEATS,
  EXTRA_SEAT_SAR,
  PLANS,
  PLAN_AMOUNTS_SAR,
  consultantLegacyActive,
  featureTier,
  quoteSelfServe,
} from "../lib/plans";
import {
  hasAdvisorAccess,
  resolveAdvisorAccessPlan,
  unlockPlanForAdvisor,
} from "../lib/advisors";
import {
  assertIndividualPlanPrices,
  displayFeatures,
  formatUsdApprox,
  planPriceLabel,
} from "../lib/pricingDisplay";
import { readApplePayDomainAssociation } from "../lib/applePayDomain";
import { signCheckoutHandoff, verifyCheckoutHandoff } from "../lib/checkoutHandoff";
import {
  MOYASAR_CARD_NETWORKS,
  checkoutPaymentMethods,
  isSaveCardRejection,
  isWalletPaymentSource,
  moyasarKeysError,
  readMoyasarKeys,
  readSamsungPayServiceId,
} from "../lib/moyasarEnv";
import { safeNextPath } from "../lib/safeNext";
import {
  assessPaidInvoice,
  extractInvoiceId,
  verifyMoyasarSecretToken,
  verifyMoyasarSignature,
} from "../lib/moyasar";
import { chosenLanguage } from "../lib/replyLanguage";
import { PDFDocument } from "pdf-lib";
import { canDownloadInvoice, invoiceBccAddress } from "../lib/invoiceMail";
import { renderInvoicePdf } from "../lib/invoicePdf";
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

  it("prices the Team plan at SAR 499 / 4,990 with 5 seats and SAR 89 extra seats", () => {
    const month = quoteSelfServe("team", "month", 0);
    const year = quoteSelfServe("team", "year", 2);
    assert.equal(month.amountSar, 499);
    assert.equal(month.seatLimit, 5);
    assert.equal(year.amountSar, 4990 + 2 * 890);
    assert.equal(year.seatLimit, 7);
    assert.equal(EXTRA_SEAT_SAR.month, 89);
    assert.equal(EXTRA_SEAT_SAR.year, EXTRA_SEAT_SAR.month * 10);
    assert.equal(quoteSelfServe("engineer", "month", 4).extraSeats, 0);
  });

  it("lists Enterprise at SAR 3,900 / month, 10× annually", () => {
    assert.equal(ENTERPRISE_FROM_SAR.month, 3900);
    assert.equal(ENTERPRISE_FROM_SAR.year, 39000);
  });

  it("keeps existing Consultant subscribers on SAR 79 until the grandfather date", () => {
    assert.equal(quoteSelfServe("consultant", "month").amountSar, 99);
    assert.equal(quoteSelfServe("consultant", "year").amountSar, 990);
    assert.equal(quoteSelfServe("consultant", "month", 0, { consultantLegacy: true }).amountSar, 79);
    assert.equal(quoteSelfServe("consultant", "year", 0, { consultantLegacy: true }).amountSar, 790);
    assert.equal(CONSULTANT_LEGACY_SAR.month, 79);
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    assert.equal(consultantLegacyActive(future), true);
    assert.equal(consultantLegacyActive(past), false);
    assert.equal(consultantLegacyActive(null), false);
    assert.equal(planPriceLabel("consultant", "year", 0, "en", true).primary, "SAR 790 / year");
  });

  it("shows the same names, SAR prices, USD, features, and annual prices", () => {
    assertIndividualPlanPrices();
    assert.equal(formatUsdApprox(19), "USD 5.07");
    assert.equal(formatUsdApprox(499), "USD 133.07");
    assert.equal(formatUsdApprox(3900), "USD 1,040.00");
    assert.equal(planPriceLabel("consultant", "year").amountSar, 990);
    assert.equal(planPriceLabel("consultant", "year").primary, "SAR 990 / year");
    assert.equal(planPriceLabel("team", "year", 1).amountSar, 4990 + 890);
    assert.equal(planPriceLabel("enterprise", "year").primary, "SAR 39,000 / year");
    assert.equal(planPriceLabel("enterprise", "month", 2).amountSar, 3900 + 2 * 299);

    for (const id of ["consultant", "team", "enterprise"] as const) {
      const plan = PLANS.find((item) => item.id === id);
      assert.ok(plan);
      assert.ok(plan.features.length > 0);
      assert.ok(plan.features.includes(ADVISOR_FEATURE_BY_PLAN[id]));
      assert.equal(displayFeatures(plan, "month").includes(ADVISOR_FEATURE_BY_PLAN[id]), true);
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

  it("builds a plain receipt with the total only until a VAT number is set", () => {
    const receipt = buildReceipt(
      {
        plan: "enterprise",
        amountSar: 4800,
        interval: "year",
        seats: 12,
        periodEnd: "2027-10-16T00:00:00.000Z",
      },
      { vatNumber: "", zatcaFlag: "true" }
    );
    assert.match(receipt.subject, /^engineerit.ai Receipt/);
    assert.match(receipt.subject, /Enterprise/);
    assert.match(receipt.subject, /4,800/);
    assert.match(receipt.text, /^Thank you/);
    assert.match(receipt.text, /\nReceipt\n/);
    assert.match(receipt.text, /Total paid: SAR 4,800/);
    assert.match(receipt.text, /Period: Annual/);
    assert.match(receipt.text, /Seats: 12/);
    assert.doesNotMatch(receipt.text, /VAT|Net:|tax invoice/i);
    assert.doesNotMatch(receipt.html, /VAT|Net:|tax invoice/i);
    assert.equal(/[\u0600-\u06FF]/.test(receipt.text), false);
  });

  it("adds a VAT breakdown and the VAT number only after VAT_NUMBER is set", () => {
    const input = {
      plan: "enterprise" as const,
      amountSar: 4800,
      interval: "year" as const,
      seats: 12,
      periodEnd: "2027-10-16T00:00:00.000Z",
    };
    const registered = buildReceipt(input, { vatNumber: "312345678900003", zatcaFlag: "" });
    assert.match(registered.text, /Receipt/);
    assert.match(registered.text, /This amount is VAT inclusive/);
    assert.match(registered.text, /Net: SAR/);
    assert.match(registered.text, /VAT 15%/);
    assert.match(registered.text, /VAT number: 312345678900003/);
    assert.doesNotMatch(registered.text, /tax invoice/i);

    const invoice = buildReceipt(input, { vatNumber: "312345678900003", zatcaFlag: "true" });
    assert.match(invoice.text, /Tax invoice/);
    assert.match(invoice.text, /VAT number: 312345678900003/);
    assert.doesNotMatch(invoice.text, /not issued yet/);
  });

  it("keeps an Arabic receipt in Arabic and an English receipt in English", () => {
    const arabic = buildReceipt(
      {
        plan: "team",
        amountSar: 349,
        interval: "month",
        seats: 5,
        locale: "ar",
      },
      { vatNumber: "312345678900003", zatcaFlag: "1" }
    );
    assert.match(arabic.text, /فاتورة ضريبية/);
    assert.match(arabic.text, /الرقم الضريبي: 312345678900003/);
    assert.match(arabic.text, /ضريبة القيمة المضافة 15٪/);
    assert.doesNotMatch(arabic.text, /Receipt|VAT|Net:|Plan:|tax invoice|Total paid/);
    assert.equal(chosenLanguage("لخص هذه الوثيقة"), "ar");
    assert.equal(chosenLanguage("Summarize this document"), "en");
  });

  it("BCCs every invoice email to INVOICE_BCC_EMAIL, defaulting to info@engineerit.ai", () => {
    assert.equal(invoiceBccAddress(undefined), "info@engineerit.ai");
    assert.equal(invoiceBccAddress("   "), "info@engineerit.ai");
    assert.equal(invoiceBccAddress(" finance@engineerit.ai "), "finance@engineerit.ai");
  });

  it("lets only the invoice owner download a paid invoice", () => {
    assert.equal(canDownloadInvoice("user-1", "user-1", "paid"), true);
    assert.equal(canDownloadInvoice("user-1", "user-2", "paid"), false);
    assert.equal(canDownloadInvoice("user-1", "user-1", "pending"), false);
    assert.equal(canDownloadInvoice(null, "user-1", "paid"), false);
  });

  it("builds a PDF invoice with the total and no VAT until VAT_NUMBER is set", async () => {
    const receipt = buildReceipt(
      { plan: "engineer", amountSar: 19, interval: "month", periodEnd: "2026-11-16T00:00:00.000Z" },
      { vatNumber: "", zatcaFlag: "true" }
    );
    assert.doesNotMatch(receipt.text, /VAT|tax invoice/i);
    const pdf = Buffer.from(await renderInvoicePdf(receipt.text));
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const loaded = await PDFDocument.load(pdf);
    assert.ok(loaded.getPageCount() >= 1);

    const arabic = buildReceipt(
      { plan: "consultant", amountSar: 99, interval: "month", locale: "ar" },
      { vatNumber: "", zatcaFlag: "" }
    );
    assert.doesNotMatch(arabic.text, /VAT|ضريبة/);
    const arabicPdf = Buffer.from(await renderInvoicePdf(arabic.text));
    const loadedArabic = await PDFDocument.load(arabicPdf);
    assert.ok(loadedArabic.getPageCount() >= 1);
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

  it("prices Enterprise at SAR 3,900 for 10 seats, plus SAR 299 per extra seat", () => {
    const month = quoteSelfServe("enterprise", "month", 0);
    const year = quoteSelfServe("enterprise", "year", 2);
    assert.equal(ENTERPRISE_INCLUDED_SEATS, 10);
    assert.equal(month.amountSar, 3900);
    assert.equal(month.seatLimit, 10);
    assert.equal(year.amountSar, 39000 + 2 * ENTERPRISE_EXTRA_SEAT_SAR.year);
    assert.equal(year.seatLimit, 12);
    assert.equal(ENTERPRISE_EXTRA_SEAT_SAR.month, 299);
    assert.equal(ENTERPRISE_EXTRA_SEAT_SAR.year, ENTERPRISE_EXTRA_SEAT_SAR.month * 10);
  });

  it("gates each advisor to the plan that includes it", () => {
    assert.equal(hasAdvisorAccess("consultant", "pmo"), true);
    assert.equal(hasAdvisorAccess("consultant", "assurance"), false);
    assert.equal(hasAdvisorAccess("team", "assurance"), true);
    assert.equal(hasAdvisorAccess("team", "operations"), false);
    assert.equal(hasAdvisorAccess("engineer", "pmo"), false);
    assert.equal(hasAdvisorAccess("professional", "decision"), false);
    assert.equal(hasAdvisorAccess("enterprise", "decision"), true);
    assert.equal(hasAdvisorAccess("enterprise", "operations"), true);
    assert.equal(unlockPlanForAdvisor("pmo"), "consultant");
    assert.equal(unlockPlanForAdvisor("assurance"), "team");
    assert.equal(unlockPlanForAdvisor("operations"), "enterprise");
    assert.equal(unlockPlanForAdvisor("decision"), "enterprise");
    assert.equal(
      resolveAdvisorAccessPlan({ tier: "pilot", trialPlan: "team", effectivePlan: "assistant" }),
      "team"
    );
    assert.equal(
      hasAdvisorAccess(
        resolveAdvisorAccessPlan({ tier: "trial", trialPlan: "team" }),
        "assurance"
      ),
      true
    );
    assert.equal(
      hasAdvisorAccess(
        resolveAdvisorAccessPlan({ tier: "pilot", trialPlan: "consultant" }),
        "assurance"
      ),
      false
    );
    assert.equal(
      resolveAdvisorAccessPlan({ tier: "free_trial", trialPlan: null, effectivePlan: "enterprise" }),
      "assistant"
    );
    assert.equal(
      resolveAdvisorAccessPlan({ tier: "assistant", effectivePlan: "enterprise" }),
      "enterprise"
    );
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
    assert.equal(safeNextPath("/checkout/continue"), "/checkout/continue");
  });

  it("names the Moyasar keys the checkout route reads at runtime", () => {
    const missing = readMoyasarKeys({});
    assert.deepEqual(missing.missing, ["MOYASAR_SECRET_KEY", "NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY"]);
    assert.match(moyasarKeysError(missing.missing), /MOYASAR_SECRET_KEY and NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY/);
    const ready = readMoyasarKeys({
      MOYASAR_SECRET_KEY: " sk_live_x ",
      NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: "pk_live_y",
    });
    assert.deepEqual(ready.missing, []);
    assert.equal(ready.secret, "sk_live_x");
  });

  it("treats a tokenization rejection as a reason to pay without saving the card", () => {
    assert.equal(isSaveCardRejection("Tokenization is not enabled"), true);
    assert.equal(isSaveCardRejection({ message: "Invalid source.save_card" }), true);
    assert.equal(isSaveCardRejection("Insufficient funds"), false);
  });

  it("offers Moyasar wallets before the card and keeps Samsung Pay hidden without a service id", () => {
    assert.deepEqual(MOYASAR_CARD_NETWORKS, ["mada", "visa", "mastercard", "amex", "unionpay"]);
    assert.deepEqual(checkoutPaymentMethods(""), ["applepay", "stcpay", "creditcard"]);
    assert.deepEqual(checkoutPaymentMethods("samsung-service"), [
      "applepay",
      "samsungpay",
      "stcpay",
      "creditcard",
    ]);
    assert.deepEqual(checkoutPaymentMethods("samsung-service", false), ["creditcard"]);
    assert.equal(readSamsungPayServiceId({ NEXT_PUBLIC_MOYASAR_SAMSUNG_PAY_SERVICE_ID: " svc " }), "svc");
    assert.equal(readSamsungPayServiceId({}), "");
    assert.equal(isWalletPaymentSource("applepay"), true);
    assert.equal(isWalletPaymentSource("samsungpay"), true);
    assert.equal(isWalletPaymentSource("stcpay"), true);
    assert.equal(isWalletPaymentSource("creditcard"), false);
    assert.equal(isWalletPaymentSource(undefined), false);
  });

  it("signs a 15-minute phone link for one checkout", () => {
    const env = { MOYASAR_SECRET_KEY: "test-secret" };
    const id = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    const now = 1_700_000_000_000;
    const signed = signCheckoutHandoff(id, now, env);
    assert.ok(signed);
    assert.equal(verifyCheckoutHandoff(signed.token, id, now + 60_000, env).ok, true);
    const mismatch = verifyCheckoutHandoff(signed.token, other, now + 60_000, env);
    const expired = verifyCheckoutHandoff(signed.token, id, now + 16 * 60 * 1000, env);
    const tampered = verifyCheckoutHandoff(`${signed.token}x`, id, now, env);
    const missing = verifyCheckoutHandoff("", id, now, env);
    assert.equal(mismatch.ok, false);
    assert.equal(expired.ok, false);
    assert.equal(tampered.ok, false);
    assert.equal(missing.ok, false);
    if (!mismatch.ok) assert.equal(mismatch.reason, "mismatch");
    if (!expired.ok) assert.equal(expired.reason, "expired");
    if (!tampered.ok) assert.equal(tampered.reason, "invalid");
    if (!missing.ok) assert.equal(missing.reason, "missing");
  });

  it("serves the Apple Pay domain file from the environment or the placeholder", async () => {
    const fromEnv = await readApplePayDomainAssociation({ APPLE_PAY_DOMAIN_ASSOCIATION: "APPLE-FILE" });
    assert.equal(fromEnv, "APPLE-FILE");
    const placeholder = await readApplePayDomainAssociation({});
    assert.match(placeholder, /engineerit\.ai/);
  });
});
