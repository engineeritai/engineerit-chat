import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminEmail } from "../lib/admin";
import { pickEffectivePlan, teamGrantsAccess } from "../lib/effectivePlan";
import {
  afterChargeFailure,
  decideRenewal,
  GRACE_DAYS,
  prorateSeatChange,
  renewalChargeHalalas,
  RENEWAL_ATTEMPT_DAY_OFFSETS,
  seatChangeIdempotencyKey,
  vatFromInclusive,
  zatcaInvoicesEnabled,
} from "../lib/billingCycle";
import {
  ADVISOR_FEATURE_BY_PLAN,
  MOYASAR_CHECKOUT_FEATURE,
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
import { featuresForLocale } from "../lib/labels";
import {
  assertIndividualPlanPrices,
  displayFeatures,
  formatUsdApprox,
  planPriceLabel,
} from "../lib/pricingDisplay";
import { downgradeNotice, pastDueNotice } from "../lib/billingNotices";
import { readApplePayDomainAssociation } from "../lib/applePayDomain";
import { signCheckoutHandoff, verifyCheckoutHandoff } from "../lib/checkoutHandoff";
import {
  APPLE_PAY_SDK_URL,
  MOYASAR_CARD_NETWORKS,
  SAMSUNG_PAY_SDK_URL,
  checkoutPaymentMethods,
  isSaveCardRejection,
  isWalletPaymentSource,
  moyasarKeysError,
  moyasarSaveOptions,
  phonePayStartsOpen,
  readMoyasarKeys,
  readSamsungPayServiceId,
  saveCardStartsChecked,
  shouldStorePaymentToken,
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
import { readFileSync } from "node:fs";
import fontkit from "@pdf-lib/fontkit";
import { paymentSuccessPath } from "../lib/checkoutReturn";
import {
  buildInvoiceDocument,
  formatArabicAmount,
  invoiceLanguage,
  paymentMethodLabel,
  usesLogicalArabic,
} from "../lib/invoiceDocument";
import { invoicePdfHref } from "../lib/invoiceDownload";
import { invoiceLineVisual, renderInvoicePdf } from "../lib/invoicePdf";
import { shellCopy } from "../lib/shell";
import { buildReceipt } from "../lib/receipt";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { embedRiyal } from "../lib/riyal";

describe("riyal sign", () => {
  it("puts the official sign on the left of the number and leaves the currency name", () => {
    assert.equal(embedRiyal("SAR 19"), "\u20C1 19");
    assert.equal(embedRiyal("SAR 3,900"), "\u20C1 3,900");
    assert.equal(embedRiyal("19 SAR"), "\u20C1 19");
    assert.equal(embedRiyal("1 USD = 3.75 SAR"), "1 USD = \u20C1 3.75");
    assert.equal(embedRiyal("41.00 ر.س"), "\u20C1 41.00");
    assert.equal(embedRiyal("3.75 ريال"), "\u20C1 3.75");
    assert.match(embedRiyal("Prices in Saudi Riyal."), /Saudi Riyal/);
    assert.equal(embedRiyal("الأسعار بالريال السعودي"), "الأسعار بالريال السعودي");
    assert.doesNotMatch(embedRiyal("Saudi Riyal"), /\u20C1/);
  });
});

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

  it("prices the Team plan at SAR 449 / 4,490 with 5 seats and SAR 89 extra seats", () => {
    const month = quoteSelfServe("team", "month", 0);
    const year = quoteSelfServe("team", "year", 2);
    assert.equal(month.amountSar, 449);
    assert.equal(month.amountHalalas, 44900);
    assert.equal(month.seatLimit, 5);
    assert.equal(year.amountSar, 4490 + 2 * 890);
    assert.equal(year.amountHalalas, (4490 + 2 * 890) * 100);
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
    assert.equal(planPriceLabel("consultant", "year", 0, "en", true).primary, "\u20C1 790 / year");
  });

  it("shows the same names, SAR prices, USD, features, and annual prices", () => {
    assertIndividualPlanPrices();
    assert.equal(formatUsdApprox(19), "USD 5.07");
    assert.equal(formatUsdApprox(449), "USD 119.73");
    assert.equal(formatUsdApprox(3900), "USD 1,040.00");
    assert.equal(planPriceLabel("consultant", "year").amountSar, 990);
    assert.equal(planPriceLabel("consultant", "year").primary, "\u20C1 990 / year");
    assert.equal(planPriceLabel("team", "year", 1).amountSar, 4490 + 890);
    assert.equal(planPriceLabel("enterprise", "year").primary, "\u20C1 39,000 / year");
    assert.equal(planPriceLabel("enterprise", "month", 2).amountSar, 3900 + 2 * 299);

    for (const id of ["consultant", "team"] as const) {
      const plan = PLANS.find((item) => item.id === id);
      assert.ok(plan);
      assert.ok(plan.features.length > 0);
      assert.ok(plan.features.includes(ADVISOR_FEATURE_BY_PLAN[id]));
      assert.equal(displayFeatures(plan, "month").includes(ADVISOR_FEATURE_BY_PLAN[id]), true);
      assert.ok(plan.features.includes(MOYASAR_CHECKOUT_FEATURE));
    }

    const consultant = PLANS.find((item) => item.id === "consultant");
    const team = PLANS.find((item) => item.id === "team");
    const enterprise = PLANS.find((item) => item.id === "enterprise");
    const engineer = PLANS.find((item) => item.id === "engineer");
    const professional = PLANS.find((item) => item.id === "professional");
    assert.ok(consultant && team && enterprise && engineer && professional);
    assert.equal(consultant.features[0], "PMO Advisor included");
    assert.equal(team.features[0], "PMO and Program Assurance included");
    assert.deepEqual(enterprise.features.slice(0, 4), [
      "PMO Advisor included",
      "Program Assurance included",
      "Operations Readiness included",
      "Decision Support included",
    ]);
    assert.equal(enterprise.features.includes(ADVISOR_FEATURE_BY_PLAN.enterprise), false);
    assert.ok(enterprise.features.includes(MOYASAR_CHECKOUT_FEATURE));
    assert.ok(engineer.features.includes(MOYASAR_CHECKOUT_FEATURE));
    assert.ok(professional.features.includes(MOYASAR_CHECKOUT_FEATURE));
    assert.equal(
      PLANS.find((item) => item.id === "assistant")?.features.includes(MOYASAR_CHECKOUT_FEATURE),
      false
    );
    const arabicPayment = "دفع آمن عبر Moyasar، شهرياً أو سنوياً";
    for (const id of ["engineer", "professional", "consultant", "team", "enterprise"] as const) {
      const plan = PLANS.find((item) => item.id === id);
      assert.ok(plan);
      assert.ok(featuresForLocale("ar", plan, "month").includes(arabicPayment));
      assert.equal(featuresForLocale("ar", plan, "month").some((feature) => feature.includes("للمدة المختارة")), false);
    }
    const arabicEnterprise = featuresForLocale("ar", enterprise, "month");
    assert.deepEqual(arabicEnterprise.slice(0, 4), [
      "مستشار إدارة المشاريع مشمول",
      "ضمان البرنامج مشمول",
      "جاهزية التشغيل مشمولة",
      "دعم القرار مشمول",
    ]);
    assert.equal(consultant.features.some((feature) => /Program Assurance|Operations Readiness|Decision Support/.test(feature)), false);
    assert.equal(team.features.some((feature) => /Operations Readiness|Decision Support/.test(feature)), false);
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
    assert.match(receipt.text, /Total paid: \u20C1 4,800/);
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
    assert.match(registered.text, /Net: \u20C1/);
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
    assert.equal(receipt.document.locale, "en");
    assert.match(receipt.document.notes.join("\n"), /VAT as applicable/);
    assert.equal(usesLogicalArabic(receipt.document), true);
    const pdf = Buffer.from(await renderInvoicePdf(receipt.document));
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const loaded = await PDFDocument.load(pdf);
    assert.ok(loaded.getPageCount() >= 1);

    const arabic = buildReceipt(
      { plan: "consultant", amountSar: 99, interval: "month", locale: "ar" },
      { vatNumber: "", zatcaFlag: "" }
    );
    assert.doesNotMatch(arabic.text, /VAT|ضريبة/);
    assert.equal(arabic.document.locale, "ar");
    assert.equal(arabic.document.title, "فاتورة");
    assert.match(arabic.document.notes.join("\n"), /ضريبة القيمة المضافة حسب الأنظمة/);
    assert.equal(usesLogicalArabic(arabic.document), true);
    const arabicPdf = Buffer.from(await renderInvoicePdf(arabic.document));
    const loadedArabic = await PDFDocument.load(arabicPdf);
    assert.ok(loadedArabic.getPageCount() >= 1);
    const drawn = pdfStreams(pdf) + pdfStreams(arabicPdf);
    assert.match(drawn, /699\.62/);
    assert.match(drawn, /1085\.73/);
    assertFontDraws("assets/fonts/Inter-Regular.ttf", ["Invoice", "SAR 41.00", "info@engineerit.ai"]);
    assertFontDraws("assets/fonts/NotoSansArabic-Regular.ttf", [
      "فاتورة",
      "المهندس المحترف",
      "ضريبة القيمة المضافة حسب الأنظمة",
    ]);
  });
});

function pdfStreams(buf: Buffer) {
  const parts: string[] = [];
  const src = buf.toString("latin1");
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    const data = Buffer.from(match[1], "latin1");
    try {
      parts.push(zlib.inflateSync(data).toString("latin1"));
    } catch {
      parts.push(data.toString("latin1"));
    }
  }
  return parts.join("\n");
}

function assertFontDraws(path: string, samples: string[]) {
  const font = fontkit.create(readFileSync(path)) as {
    layout: (text: string) => { glyphs: { id: number }[] };
  };
  for (const sample of samples) {
    const missing = font.layout(sample).glyphs.filter((glyph) => glyph.id === 0).length;
    assert.equal(missing, 0, `${path} ${sample}`);
  }
}

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

  it("charges on the renewal date and retries on day 1 and day 3", () => {
    assert.deepEqual(RENEWAL_ATTEMPT_DAY_OFFSETS, [0, 1, 3]);
    assert.equal(GRACE_DAYS, 3);
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
    assert.equal(day1.action, "charge");
    assert.equal(day3.action, "charge");
    if (day1.action === "charge") assert.equal(day1.attempt, 1);
    if (day3.action === "charge") assert.equal(day3.attempt, 2);
    assert.equal(
      decideRenewal({
        ...base,
        now: new Date("2026-11-23T00:00:00.000Z"),
        failureCount: 3,
        status: "past_due",
      }).action,
      "downgrade"
    );
  });

  it("downgrades after the day-3 failure and expires a cancellation without charging", () => {
    assert.equal(
      decideRenewal({
        ...base,
        now: new Date("2026-11-20T00:00:00.000Z"),
        failureCount: 3,
        status: "past_due",
      }).action,
      "downgrade"
    );
    assert.deepEqual(afterChargeFailure(2), { status: "downgrade", failureCount: 3 });
    const firstRetry = afterChargeFailure(0);
    const secondRetry = afterChargeFailure(1);
    assert.equal(firstRetry.status, "past_due");
    assert.equal(secondRetry.status, "past_due");
    if (firstRetry.status === "past_due") assert.equal(firstRetry.retryDay, 1);
    if (secondRetry.status === "past_due") assert.equal(secondRetry.retryDay, 3);

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
    assert.equal(
      placeholder,
      "7b2276657273696f6e223a312c227073704964223a2243423939394539333137363744463341383644424145363131413331323544303133353543373842303636343033393832323336324134413238303246334136222c22637265617465644f6e223a313738373134353634373931307d"
    );
    assert.equal(placeholder.endsWith("\n"), false);
  });
});

describe("checkout and invoice regressions", () => {
  it("keeps Apple Pay on every desktop browser and loads Apple's SDK", () => {
    assert.equal(APPLE_PAY_SDK_URL, "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js");
    assert.match(SAMSUNG_PAY_SDK_URL, /samsungpay_web_sdk\.js$/);
    assert.deepEqual(checkoutPaymentMethods("samsung-service"), [
      "applepay",
      "samsungpay",
      "stcpay",
      "creditcard",
    ]);
    assert.equal(checkoutPaymentMethods("").includes("applepay"), true);
    assert.equal(checkoutPaymentMethods("").includes("stcpay"), true);
    assert.equal(MOYASAR_CARD_NETWORKS[0], "mada");
    assert.equal(isWalletPaymentSource("applepay"), true);
    assert.equal(isWalletPaymentSource("creditcard"), false);
  });

  it("keeps the phone QR collapsed so it does not replace Apple Pay", () => {
    assert.equal(phonePayStartsOpen(), false);
    assert.match(shellCopy.en.checkout.scanToPay, /STC Pay or mada/);
    assert.doesNotMatch(shellCopy.en.checkout.scanToPay, /Apple Pay/);
    assert.match(shellCopy.ar.checkout.scanToPay, /STC Pay/);
    assert.match(shellCopy.en.checkout.walletReminder, /Apple Pay/);
    assert.match(shellCopy.en.checkout.walletReminder, /STC Pay/);
    assert.match(shellCopy.en.checkout.walletReminder, /automatically/);
    assert.match(shellCopy.ar.checkout.walletReminder, /STC Pay/);
    assert.match(shellCopy.en.checkout.securePay, /Moyasar/);
    assert.match(shellCopy.en.checkout.cardNotStored, /never stored/);
    assert.equal(shellCopy.en.billing.renewsOn, "Renews automatically on");
    assert.equal(shellCopy.ar.billing.renewsOn, "يتجدد تلقائيًا في");
    assert.equal(saveCardStartsChecked(), true);
    assert.equal(isSaveCardRejection("Invalid source.save_card"), true);
    const saved = moyasarSaveOptions({
      saveCard: true,
      wallets: true,
      samsungServiceId: "svc",
      orderNumber: "ord",
    });
    assert.equal(saved.credit_card?.save_card, true);
    assert.equal(saved.apple_pay?.save_card, true);
    assert.equal(saved.samsung_pay?.save_card, true);
    const cardOnly = moyasarSaveOptions({
      saveCard: true,
      wallets: false,
      samsungServiceId: "",
      orderNumber: "ord",
    });
    assert.equal(cardOnly.apple_pay, undefined);
    assert.equal(cardOnly.credit_card?.save_card, true);
    assert.equal(shouldStorePaymentToken({ type: "applepay", token: "token_ap" }), true);
    assert.equal(shouldStorePaymentToken({ type: "creditcard", token: "token_cc" }), true);
    assert.equal(shouldStorePaymentToken({ type: "samsungpay", token: "token_sp" }), true);
    assert.equal(shouldStorePaymentToken({ type: "stcpay", token: "token_stc" }), false);
    assert.equal(shouldStorePaymentToken({ type: "stcpay" }), false);
    assert.match(pastDueNotice("en", { plan: "Team", retryDate: "17 Nov 2026", billingUrl: "https://engineerit.ai/account/billing" }).text, /day-3/);
    assert.match(pastDueNotice("ar", { plan: "الفريق", retryDate: "17 نوفمبر 2026", billingUrl: "https://engineerit.ai/account/billing" }).text, /اليوم 3/);
    assert.match(downgradeNotice("en").text, /Assistant Engineer/);
    assert.match(downgradeNotice("ar").text, /المهندس المساعد/);
    const team = PLANS.find((plan) => plan.id === "team");
    assert.equal(team?.features.includes(MOYASAR_CHECKOUT_FEATURE), true);
    assert.equal(team?.features.some((feature) => /automatically/i.test(feature)), false);
    const pricingCopy = [
      readFileSync("lib/marketing/en.ts", "utf8"),
      readFileSync("lib/marketing/ar.ts", "utf8"),
      readFileSync("lib/plans.ts", "utf8"),
      readFileSync("lib/labels.ts", "utf8"),
    ].join("\n");
    assert.equal(/renews automatically|يتجدد تلقائي/i.test(pricingCopy), false);
    const billingRoute = readFileSync("app/api/billing/route.ts", "utf8");
    assert.equal(billingRoute.includes("moyasar_token"), false);
    const renewalJob = readFileSync("lib/renewals.ts", "utf8");
    assert.match(renewalJob, /dry:\$\{decision\.action\}/);
    assert.equal(renewalJob.includes("moyasar_token:"), false);
  });

  it("returns paid checkouts to the success page and keeps the invoice email BCC", () => {
    assert.equal(
      paymentSuccessPath("11111111-1111-4111-8111-111111111111", "signed"),
      "/payment/success?checkout=11111111-1111-4111-8111-111111111111&pay=signed"
    );
    assert.equal(invoiceBccAddress(undefined), "info@engineerit.ai");
    assert.equal(shellCopy.en.profile.paymentSuccess, "Payment successful");
    assert.equal(shellCopy.en.profile.goToProfile, "Go to profile");
    assert.equal(shellCopy.ar.profile.goToProfile, "الذهاب إلى الملف");
    assert.equal(shellCopy.en.profile.downloadInvoice, "Download invoice (PDF)");
  });

  it("regenerates profile and success downloads in the UI language, English by default", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    assert.equal(invoiceLanguage(null), "en");
    assert.equal(invoiceLanguage("en"), "en");
    assert.equal(invoiceLanguage("ar"), "ar");
    assert.equal(invoicePdfHref(id), `/api/invoices/${id}/pdf?lang=en`);
    assert.equal(invoicePdfHref(id, "tok", "ar"), `/api/invoices/${id}/pdf?pay=tok&lang=ar`);
    assert.doesNotMatch(invoicePdfHref(id, "", "ar"), /storage|supabase|\.pdf$/);

    const english = buildInvoiceDocument({
      plan: "professional",
      amountSar: 41,
      interval: "month",
      invoiceNumber: "inv_41",
      customerName: "Nora Ahmed",
      customerEmail: "nora@example.com",
      periodStart: "2026-10-16T00:00:00.000Z",
      periodEnd: "2026-11-16T00:00:00.000Z",
      paymentMethod: "applepay",
      paymentId: "pay_123",
      issuedAt: "2026-10-16T00:00:00.000Z",
    });
    assert.equal(english.locale, "en");
    assert.equal(english.title, "Invoice");
    assert.equal(paymentMethodLabel("applepay", "en"), "Apple Pay");
    assert.equal(paymentMethodLabel("creditcard", "en"), "Card (mada, Visa, Mastercard, Amex)");
    assert.match(english.rows.map((row) => `${row.label}: ${row.value}`).join("\n"), /Apple Pay/);
    assert.match(english.rows.map((row) => row.value).join("\n"), /pay_123/);
    assert.match(english.rows.map((row) => row.label).join("\n"), /Period start/);
    assert.match(english.rows.map((row) => row.label).join("\n"), /Period end/);
    assert.equal(usesLogicalArabic(english), true);

    const arabic = buildInvoiceDocument({
      plan: "professional",
      amountSar: 41,
      interval: "month",
      locale: "ar",
      customerName: "نورة أحمد",
      paymentMethod: "stcpay",
    });
    assert.equal(arabic.locale, "ar");
    assert.equal(arabic.title, "فاتورة");
    assert.match(arabic.customerName, /نورة/);
    assert.equal(paymentMethodLabel("stcpay", "ar"), "STC Pay");
    assert.equal(usesLogicalArabic(arabic), true);
    assert.equal(arabic.totalValue, "\u20C1 41.00");
    assert.equal(formatArabicAmount(41), "\u20C1 41.00");
    assert.equal(invoiceLineVisual("\u20C1 41.00"), "\u20C1 41.00");
    assert.equal(invoiceLineVisual("الصافي: \u20C1 41.00").startsWith("\u20C1 41.00"), true);
    const card = paymentMethodLabel("creditcard", "ar");
    assert.equal(card, "بطاقة — مدى، فيزا، ماستركارد، أمريكان إكسبريس");
    assert.doesNotMatch(card, /[()]/);
    assert.doesNotMatch(invoiceLineVisual(card), /[()]/);
    const logo = readFileSync("assets/invoice-logo.png");
    const logoWidth = logo.readUInt32BE(16);
    const logoHeight = logo.readUInt32BE(20);
    assert.ok(logoHeight < 80 && logoHeight > 40, `logo is cropped, not the padded square (${logoWidth}x${logoHeight})`);
  });

  it("still charges a renewal on the period end for the cron", () => {
    const periodEnd = new Date("2026-11-16T00:00:00.000Z");
    const decision = decideRenewal({
      subscriptionId: "sub_1",
      periodEnd,
      status: "active",
      cancelAtPeriodEnd: false,
      failureCount: 0,
      now: periodEnd,
    });
    assert.equal(decision.action, "charge");
  });
});
