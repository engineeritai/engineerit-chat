import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { checkoutFailureKind } from "../lib/checkoutFailure";
import { moyasarFormTranslations } from "../lib/moyasarEnv";
import { chargeOutcome } from "../lib/renewals";
import { confirmCheckout } from "../lib/settlePayment";
import { cancelStalePendingInvoices, chooseStaleInvoiceAction } from "../lib/staleInvoices";
import {
  normalizePendingCheckout,
  pendingCheckoutPath,
  pendingFromMetadata,
  pendingFromSearch,
} from "../lib/pendingCheckout";
import { PLAN_AMOUNTS_SAR } from "../lib/plans";
import { freeLimitUpgradeMessage } from "../lib/upgradePrompt";
import { memSupabase } from "./memSupabase";

const CHECKOUT = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const originalFetch = global.fetch;

function checkoutRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CHECKOUT,
    invoice_id: null,
    payment_id: null,
    plan: "engineer",
    billing_interval: "month",
    amount_sar: 19,
    amount_halalas: 1900,
    seat_limit: 1,
    extra_seats: 0,
    customer_email: "payer+test@example.com",
    user_id: USER,
    lead_id: null,
    company: null,
    status: "pending",
    activated_at: null,
    receipt_sent_at: null,
    period_end: null,
    purpose: "checkout",
    locale: "en",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay_1",
    status: "paid",
    amount: 1900,
    currency: "SAR",
    metadata: { checkout_id: CHECKOUT },
    source: { type: "creditcard", token: "token_test", company: "mada", number: "420132******1010" },
    ...overrides,
  };
}

function mockMoyasar(handler: (url: string) => unknown) {
  process.env.MOYASAR_SECRET_KEY = "sk_test_payment_journey";
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = handler(url);
    if (body instanceof Error) throw body;
    if (body == null) return new Response("missing", { status: 404 });
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe("payment settlement", () => {
  it("activates the paid plan once and ignores a second confirmation", async () => {
    const admin = memSupabase();
    admin.tables.moyasar_invoices = [checkoutRow()];
    mockMoyasar((url) => (url.includes("/payments/pay_1") ? payment() : { payments: [] }));

    const row = checkoutRow();
    const first = await confirmCheckout(admin as never, row, "pay_1");
    const second = await confirmCheckout(admin as never, row, "pay_1");

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok) assert.equal(first.plan, "engineer");
    assert.equal(admin.tables.subscriptions.length, 1);
    assert.equal(admin.tables.subscriptions[0].plan, "engineer");
    assert.equal(admin.tables.subscriptions[0].price, 19);
    assert.equal(admin.tables.subscriptions[0].currency, "SAR");
    assert.equal(admin.tables.profiles[0].subscription_tier, "engineer");
    const end = new Date(String(admin.tables.subscriptions[0].end_date)).getTime();
    const days = (end - Date.now()) / (24 * 60 * 60 * 1000);
    assert.ok(days > 29 && days < 31, `expected about 30 days, got ${days}`);
    assert.equal(admin.tables.moyasar_invoices[0].status, "paid");
    assert.equal(admin.tables.saved_cards.length, 1);
    assert.equal(admin.tables.billing_subscriptions[0].plan, "engineer");
    assert.equal(admin.tables.billing_subscriptions[0].cancel_at_period_end, false);
  });

  it("does not turn a plan on when Moyasar says the payment failed, was cancelled, or the amount or currency differs", async () => {
    for (const remote of [
      payment({ status: "failed" }),
      payment({ status: "canceled" }),
      payment({ status: "voided" }),
      payment({ amount: 100 }),
      payment({ currency: "USD" }),
    ]) {
      const admin = memSupabase();
      admin.tables.moyasar_invoices = [checkoutRow()];
      mockMoyasar((url) => (url.includes("/payments/") && !url.includes("metadata") ? remote : { payments: [] }));
      const result = await confirmCheckout(admin as never, checkoutRow(), "pay_1");
      assert.equal(result.ok, false);
      assert.equal(admin.tables.subscriptions?.length || 0, 0);
      assert.notEqual(admin.tables.moyasar_invoices[0].status, "paid");
    }
  });

  it("settles from the webhook lookup when the browser never returns", async () => {
    const admin = memSupabase();
    admin.tables.moyasar_invoices = [checkoutRow()];
    mockMoyasar((url) => {
      if (url.includes("metadata[checkout_id]")) return { payments: [payment()] };
      if (url.includes("/payments/pay_1")) return payment();
      return null;
    });
    const result = await confirmCheckout(admin as never, checkoutRow(), null);
    assert.equal(result.ok, true);
    assert.equal(admin.tables.profiles[0].subscription_tier, "engineer");
    assert.equal(admin.tables.subscriptions.length, 1);
  });

  it("settles the matching paid payment when the id in hand is the wrong amount", async () => {
    const admin = memSupabase();
    admin.tables.moyasar_invoices = [checkoutRow()];
    mockMoyasar((url) => {
      if (url.includes("/payments/pay_bad")) return payment({ id: "pay_bad", amount: 100 });
      if (url.includes("metadata[checkout_id]")) return { payments: [payment()] };
      if (url.includes("/payments/pay_1")) return payment();
      return null;
    });
    const result = await confirmCheckout(admin as never, checkoutRow(), "pay_bad");
    assert.equal(result.ok, true);
    assert.equal(admin.tables.subscriptions.length, 1);
    assert.equal(admin.tables.moyasar_invoices[0].payment_id, "pay_1");
  });
});

describe("stale pending invoices", () => {
  it("settles a paid Moyasar payment and cancels only an unpaid one", async () => {
    const paidId = "33333333-3333-4333-8333-333333333333";
    const failedId = "44444444-4444-4444-8444-444444444444";
    const admin = memSupabase();
    admin.tables.moyasar_invoices = [
      checkoutRow({ id: paidId }),
      checkoutRow({ id: failedId }),
    ];
    mockMoyasar((url) => {
      if (url.includes(paidId)) return { payments: [payment({ metadata: { checkout_id: paidId } })] };
      if (url.includes(failedId)) return { payments: [payment({ id: "pay_failed", status: "failed", metadata: { checkout_id: failedId } })] };
      if (url.includes("/payments/pay_1")) return payment({ metadata: { checkout_id: paidId } });
      return { payments: [] };
    });

    const results = await cancelStalePendingInvoices(admin as never, new Date());
    const paid = admin.tables.moyasar_invoices.find((row) => row.id === paidId);
    const failed = admin.tables.moyasar_invoices.find((row) => row.id === failedId);
    assert.equal(paid?.status, "paid");
    assert.equal(failed?.status, "cancelled");
    assert.equal(results.find((item) => item.id === paidId)?.action, "settled");
    assert.equal(results.find((item) => item.id === failedId)?.action, "cancelled");
    assert.equal(admin.tables.subscriptions.length, 1);
  });

  it("leaves the invoice pending when Moyasar cannot be checked", async () => {
    const admin = memSupabase();
    admin.tables.moyasar_invoices = [checkoutRow({ payment_id: "pay_down" })];
    mockMoyasar(() => new Error("network down"));
    const results = await cancelStalePendingInvoices(admin as never, new Date());
    assert.equal(results[0].action, "kept");
    assert.equal(admin.tables.moyasar_invoices[0].status, "pending");
  });

  it("keeps a paid payment it cannot safely apply", () => {
    const row = { id: CHECKOUT, amount_halalas: 1900 };
    assert.equal(chooseStaleInvoiceAction([payment()], row), "settle");
    assert.equal(chooseStaleInvoiceAction([payment({ amount: 100 })], row), "keep");
    assert.equal(chooseStaleInvoiceAction([payment({ currency: "USD" })], row), "keep");
    assert.equal(chooseStaleInvoiceAction([payment({ status: "failed" })], row), "cancel");
    assert.equal(chooseStaleInvoiceAction([], row), "cancel");
  });
});

describe("renewal charges fail safely", () => {
  it("extends only a paid SAR charge of the expected amount", () => {
    assert.equal(chargeOutcome("paid", 1900, "SAR", 1900), "paid");
    assert.equal(chargeOutcome("paid", 1900, "USD", 1900), "pending");
    assert.equal(chargeOutcome("paid", 100, "SAR", 1900), "pending");
    assert.equal(chargeOutcome("failed", 1900, "SAR", 1900), "failed");
    assert.equal(chargeOutcome("initiated", 1900, "SAR", 1900), "pending");
  });
});

describe("checkout copy and the free-plan upgrade prompt", () => {
  it("corrects the Moyasar save-card notice in English and Arabic", () => {
    const copy = moyasarFormTranslations();
    assert.equal(copy.en["form.save_card_notice"], "Your card data will be saved upon submit.");
    assert.equal(copy.en["form.save_card_notice"].includes("You card"), false);
    assert.equal(copy.ar["form.save_card_notice"].startsWith("."), false);
    assert.match(copy.ar["form.save_card_notice"], /بطاقتك/);
  });

  it("names a cancelled payment separately from a declined one", () => {
    assert.equal(checkoutFailureKind("cancelled"), "cancelled");
    assert.equal(checkoutFailureKind("voided"), "cancelled");
    assert.equal(checkoutFailureKind("failed"), "failed");
    assert.equal(checkoutFailureKind("paid", "amount_mismatch"), "mismatch");
  });

  it("offers Engineer at the published SAR 19 price with file analysis and no daily cap", () => {
    assert.equal(PLAN_AMOUNTS_SAR.engineer.month, 19);
    const en = freeLimitUpgradeMessage("en");
    const ar = freeLimitUpgradeMessage("ar");
    assert.match(en, /SAR 19/);
    assert.match(en, /no daily reply cap/i);
    assert.match(en, /Word, Excel, and PowerPoint/);
    assert.equal(/PMO|advisor|export/i.test(en), false);
    assert.match(ar, /19/);
    assert.match(ar, /وورد/);
    assert.match(ar, /بلا حد يومي/);
    assert.equal(ar.includes("PMO"), false);
  });

  it("keeps the chosen plan through the register and login return path", () => {
    const pending = normalizePendingCheckout({ planId: "engineer", interval: "month", extraSeats: 0 });
    assert.ok(pending);
    const path = pendingCheckoutPath(pending!);
    assert.equal(path, "/checkout/continue?plan=engineer&interval=month&seats=0");
    const params = new URLSearchParams(path.split("?")[1]);
    assert.deepEqual(pendingFromSearch(params), pending);
    assert.deepEqual(
      pendingFromMetadata({ pending_plan: "professional", pending_interval: "year", pending_seats: 2 }),
      { planId: "professional", interval: "year", extraSeats: 2 }
    );
    assert.equal(pendingFromMetadata({ pending_plan: "" }), null);
    assert.equal(normalizePendingCheckout({ planId: "assistant" }), null);
  });
});
