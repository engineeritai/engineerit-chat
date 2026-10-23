import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { savedCardRecord } from "../lib/billingAccount";
import { assessTokenCharge, createMoyasarTokenPayment, MoyasarRequestError } from "../lib/moyasar";
import { isMoyasarSaveNotice, replaceMoyasarSaveNotice } from "../lib/moyasarNotice";
import { PLAN_AMOUNTS_SAR } from "../lib/plans";
import { settleCheckout, type CheckoutRow } from "../lib/settlePayment";
import { classifyCheckoutPayments, expireStaleCheckouts, STALE_PENDING_MS, staleCheckoutAction } from "../lib/staleCheckouts";
import { shellCopy } from "../lib/shell";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
type Filter = { op: "eq" | "in" | "is" | "gte" | "lt" | "lte"; col: string; val: unknown };

function matches(row: Row, filters: Filter[]) {
  return filters.every((filter) => {
    const value = row[filter.col];
    if (filter.op === "eq") return value === filter.val;
    if (filter.op === "in") return Array.isArray(filter.val) && filter.val.includes(value);
    if (filter.op === "is") return filter.val == null ? value == null : value === filter.val;
    if (filter.op === "gte") return String(value ?? "") >= String(filter.val ?? "");
    if (filter.op === "lt") return String(value ?? "") < String(filter.val ?? "");
    return String(value ?? "") <= String(filter.val ?? "");
  });
}

function fakeAdmin() {
  const tables: Record<string, Row[]> = {
    moyasar_invoices: [],
    subscriptions: [],
    profiles: [],
    billing_subscriptions: [],
    saved_cards: [],
    renewal_attempts: [],
    teams: [],
    enterprise_leads: [],
  };

  class Query implements PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
    private selected = false;
    private filters: Filter[] = [];
    constructor(
      private table: string,
      private op: "select" | "update" | "insert" | "upsert" = "select",
      private payload: Row | Row[] | null = null,
      private opts?: { onConflict?: string }
    ) {}
    select() {
      this.selected = true;
      return this;
    }
    eq(col: string, val: unknown) {
      this.filters.push({ op: "eq", col, val });
      return this;
    }
    in(col: string, val: unknown) {
      this.filters.push({ op: "in", col, val });
      return this;
    }
    is(col: string, val: unknown) {
      this.filters.push({ op: "is", col, val });
      return this;
    }
    gte(col: string, val: unknown) {
      this.filters.push({ op: "gte", col, val });
      return this;
    }
    lt(col: string, val: unknown) {
      this.filters.push({ op: "lt", col, val });
      return this;
    }
    lte(col: string, val: unknown) {
      this.filters.push({ op: "lte", col, val });
      return this;
    }
    order() {
      return this;
    }
    limit() {
      return this;
    }
    update(payload: Row) {
      this.op = "update";
      this.payload = payload;
      return this;
    }
    insert(payload: Row) {
      this.op = "insert";
      this.payload = payload;
      return this;
    }
    upsert(payload: Row, opts?: { onConflict?: string }) {
      this.op = "upsert";
      this.payload = payload;
      this.opts = opts;
      return this;
    }
    private rows() {
      return tables[this.table].filter((row) => matches(row, this.filters));
    }
    private run() {
      const table = tables[this.table];
      if (!table) return { data: null, error: { message: `missing table ${this.table}` } };
      if (this.op === "select") return { data: this.rows(), error: null };
      if (this.op === "update") {
        const hit = this.rows();
        for (const row of hit) Object.assign(row, this.payload);
        return { data: this.selected ? hit : null, error: null };
      }
      if (this.op === "insert") {
        const copy = { id: crypto.randomUUID(), ...(this.payload as Row) };
        table.push(copy);
        return { data: this.selected ? [copy] : null, error: null };
      }
      const conflict = this.opts?.onConflict || "id";
      const incoming = { ...(this.payload as Row) };
      const existing = table.find((row) => row[conflict] === incoming[conflict]);
      if (existing) Object.assign(existing, incoming);
      else table.push({ id: crypto.randomUUID(), ...incoming });
      const saved = table.find((row) => row[conflict] === incoming[conflict]) || null;
      return { data: saved ? [saved] : [], error: null };
    }
    maybeSingle() {
      const result = this.run();
      return Promise.resolve({ data: result.data?.[0] ?? null, error: result.error });
    }
    single() {
      const result = this.run();
      const row = result.data?.[0];
      return Promise.resolve({ data: row ?? null, error: row ? null : { message: "No row" } });
    }
    then<TResult1 = { data: Row[] | null; error: { message: string } | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: Row[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(this.run()).then(onfulfilled, onrejected);
    }
  }

  return {
    tables,
    client: { from: (table: string) => new Query(table) } as unknown as SupabaseClient,
  };
}

function checkout(overrides: Partial<CheckoutRow> = {}): CheckoutRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    invoice_id: null,
    plan: "engineer",
    billing_interval: "month",
    amount_sar: 19,
    amount_halalas: 1900,
    seat_limit: 1,
    extra_seats: 0,
    customer_email: null,
    user_id: "22222222-2222-4222-8222-222222222222",
    lead_id: null,
    company: null,
    status: "pending",
    activated_at: null,
    receipt_sent_at: null,
    period_end: null,
    payment_id: null,
    purpose: "checkout",
    locale: "en",
    ...overrides,
  };
}

function paidPayment(checkoutId: string, amount = 1900, currency = "SAR") {
  return {
    id: "pay_1",
    status: "paid",
    amount,
    currency,
    metadata: { checkout_id: checkoutId },
    source: {
      type: "creditcard",
      token: "token_abc",
      company: "mada",
      name: "Nora Ahmed",
      number: "4111111111111111",
    },
  };
}

const originalFetch = global.fetch;
const originalSecret = process.env.MOYASAR_SECRET_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.MOYASAR_SECRET_KEY;
  else process.env.MOYASAR_SECRET_KEY = originalSecret;
});

describe("card data stays at Moyasar", () => {
  it("stores a token and the last four, never the PAN", () => {
    const pan = "4111111111111111";
    const row = savedCardRecord("user", {
      status: "paid",
      source: { type: "creditcard", token: "token_abc", number: pan, company: "visa", name: "Nora" },
    });
    assert.ok(row);
    assert.equal(row.moyasar_token, "token_abc");
    assert.equal(row.last_four, "1111");
    assert.equal(JSON.stringify(row).includes(pan), false);
    assert.equal(savedCardRecord("user", { source: { token: "not-a-token", number: pan } }), null);
    for (const file of [
      "app/api/payments/moyasar/complete/route.ts",
      "app/api/payments/moyasar/callback/route.ts",
      "app/api/checkout/moyasar/route.ts",
      "app/components/MoyasarCardForm.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      assert.equal(/cvc|cvv|card_number|source\.number/i.test(source), false);
    }
  });
});

describe("payment settlement", () => {
  it("turns the plan on once when Moyasar reports the same amount in SAR", async () => {
    const { client, tables } = fakeAdmin();
    const row = checkout();
    tables.moyasar_invoices.push({ ...row });
    const payment = paidPayment(row.id);
    const first = await settleCheckout(client, row, payment, payment);
    const second = await settleCheckout(client, { ...row, activated_at: "already" }, payment, payment);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(tables.subscriptions.length, 1);
    assert.equal(tables.profiles[0]?.subscription_tier, "engineer");
    assert.equal(tables.moyasar_invoices[0]?.status, "paid");
    assert.equal(tables.moyasar_invoices[0]?.payment_id, "pay_1");
    assert.equal(tables.saved_cards.length, 1);
    assert.equal(JSON.stringify(tables.saved_cards).includes("4111111111111111"), false);
    assert.equal(tables.billing_subscriptions[0]?.status, "active");
  });

  it("does not turn a plan on for a decline, a cancel, a short amount, or the wrong currency", async () => {
    for (const remote of [
      { status: "failed", amount: 1900, currency: "SAR" },
      { status: "voided", amount: 1900, currency: "SAR" },
      { status: "paid", amount: 100, currency: "SAR" },
      { status: "paid", amount: 1900, currency: "USD" },
      { status: "paid", amount: 1900, currency: "" },
    ]) {
      const { client, tables } = fakeAdmin();
      const row = checkout();
      tables.moyasar_invoices.push({ ...row });
      const result = await settleCheckout(client, row, remote, remote);
      assert.equal(result.ok, false);
      assert.equal(tables.subscriptions.length, 0);
      assert.equal(tables.profiles.length, 0);
      assert.equal(tables.moyasar_invoices[0]?.status, "pending");
    }
  });

  it("is idempotent when the same paid callback arrives twice", async () => {
    const { client, tables } = fakeAdmin();
    const row = checkout();
    tables.moyasar_invoices.push({ ...row });
    const payment = paidPayment(row.id);
    await settleCheckout(client, row, payment, payment);
    const stored = tables.moyasar_invoices[0] as CheckoutRow;
    await settleCheckout(client, stored, payment, payment);
    assert.equal(tables.subscriptions.length, 1);
    assert.equal(tables.billing_subscriptions.length, 1);
    assert.equal(tables.moyasar_invoices[0]?.status, "paid");
  });
});

describe("stale pending checkouts", () => {
  it("keeps a checkout until it is three days old, and never cancels when Moyasar cannot be checked", () => {
    assert.equal(staleCheckoutAction(STALE_PENDING_MS - 1, "unpaid"), "keep");
    assert.equal(staleCheckoutAction(STALE_PENDING_MS, "unavailable"), "keep");
    assert.equal(staleCheckoutAction(STALE_PENDING_MS, "open"), "keep");
    assert.equal(staleCheckoutAction(STALE_PENDING_MS, "paid"), "settle");
    assert.equal(staleCheckoutAction(STALE_PENDING_MS, "unpaid"), "cancel");
    const paid = paidPayment("checkout");
    assert.equal(classifyCheckoutPayments("checkout", 1900, [paid]), "paid");
    assert.equal(classifyCheckoutPayments("checkout", 1900, [{ ...paid, currency: "USD" }]), "unpaid");
    assert.equal(classifyCheckoutPayments("checkout", 1900, [{ ...paid, status: "initiated" }]), "open");
  });

  it("settles a paid Moyasar payment instead of cancelling it", async () => {
    const { client, tables } = fakeAdmin();
    const row = checkout();
    tables.moyasar_invoices.push({ ...row, created_at: new Date(Date.now() - STALE_PENDING_MS - 1000).toISOString() });
    const payment = paidPayment(row.id);
    process.env.MOYASAR_SECRET_KEY = "sk_test_example";
    global.fetch = (async (input: RequestInfo | URL) => {
      const href = String(input);
      const body = href.includes("/payments/pay_1") ? payment : { payments: [payment] };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const results = await expireStaleCheckouts(client, new Date());
    assert.equal(results[0]?.action, "settle");
    assert.equal(tables.moyasar_invoices[0]?.status, "paid");
    assert.equal(tables.profiles[0]?.subscription_tier, "engineer");
  });

  it("cancels an unpaid checkout only after Moyasar lists no paid payment", async () => {
    const { client, tables } = fakeAdmin();
    const row = checkout();
    tables.moyasar_invoices.push({ ...row, created_at: new Date(Date.now() - STALE_PENDING_MS - 1000).toISOString() });
    process.env.MOYASAR_SECRET_KEY = "sk_test_example";
    global.fetch = (async () =>
      new Response(JSON.stringify({ payments: [{ id: "pay_failed", status: "failed", amount: 1900, currency: "SAR", metadata: { checkout_id: row.id } }] }), {
        status: 200,
      })) as typeof fetch;
    const results = await expireStaleCheckouts(client, new Date());
    assert.equal(results[0]?.action, "cancel");
    assert.equal(tables.moyasar_invoices[0]?.status, "cancelled");
    assert.equal(tables.profiles.length, 0);
  });

  it("leaves the checkout pending when Moyasar cannot be reached", async () => {
    const { client, tables } = fakeAdmin();
    const row = checkout();
    tables.moyasar_invoices.push({ ...row, created_at: new Date(Date.now() - STALE_PENDING_MS - 1000).toISOString() });
    process.env.MOYASAR_SECRET_KEY = "sk_test_example";
    global.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    const results = await expireStaleCheckouts(client, new Date());
    assert.equal(results[0]?.action, "keep");
    assert.equal(tables.moyasar_invoices[0]?.status, "pending");
  });
});

describe("saved-card renewal safety", () => {
  it("does not count a paid charge unless the amount and currency match", () => {
    assert.equal(assessTokenCharge(1900, { status: "paid", amount: 1900, currency: "SAR" }), "paid");
    assert.equal(assessTokenCharge(1900, { status: "paid", amount: 1900, currency: "USD" }), "failed");
    assert.equal(assessTokenCharge(1900, { status: "failed", amount: 1900, currency: "SAR" }), "failed");
    assert.equal(assessTokenCharge(1900, { status: "initiated", amount: 1900, currency: "SAR" }), "pending");
  });

  it("keeps a renewal pending when Moyasar cannot be reached, and fails a decline without activating", async () => {
    process.env.MOYASAR_SECRET_KEY = "sk_test_example";
    global.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    await assert.rejects(
      () =>
        createMoyasarTokenPayment("sk_test_example", {
          amount: 1900,
          currency: "SAR",
          description: "renewal",
          callback_url: "https://engineerit.ai/api/payments/moyasar/callback",
          token: "token_abc",
          metadata: { kind: "renewal" },
          idempotencyKey: "renewal:test",
        }),
      (err: unknown) => err instanceof MoyasarRequestError && err.kind === "transport"
    );

    global.fetch = (async () => new Response(JSON.stringify({ message: "declined" }), { status: 400 })) as typeof fetch;
    await assert.rejects(
      () =>
        createMoyasarTokenPayment("sk_test_example", {
          amount: 1900,
          currency: "SAR",
          description: "renewal",
          callback_url: "https://engineerit.ai/api/payments/moyasar/callback",
          token: "token_abc",
          metadata: { kind: "renewal" },
          idempotencyKey: "renewal:test",
        }),
      (err: unknown) => err instanceof MoyasarRequestError && err.kind === "decline"
    );
  });
});

describe("checkout and upgrade copy", () => {
  it("replaces Moyasar's save-card typo in English and Arabic", () => {
    assert.equal(isMoyasarSaveNotice("You card data will be saved upon submit."), true);
    assert.equal(isMoyasarSaveNotice("سيتم حفظ بيانات البطاقة عند إتمام العملية."), true);
    assert.equal(
      replaceMoyasarSaveNotice("You card data will be saved upon submit.", shellCopy.en.checkout.saveNotice),
      shellCopy.en.checkout.saveNotice
    );
    assert.match(shellCopy.en.checkout.saveNotice, /Moyasar/);
    assert.match(shellCopy.ar.checkout.saveNotice, /ميسر/);
    assert.doesNotMatch(shellCopy.en.checkout.saveNotice, /You card/);
    assert.match(shellCopy.en.checkout.vatNote, /SAR/);
    assert.match(shellCopy.en.checkout.cancelHow, /Billing/);
    assert.match(shellCopy.ar.checkout.cancelHow, /الفوترة/);
    assert.match(shellCopy.en.checkout.paymentFailed, /not changed/);
    assert.match(shellCopy.ar.checkout.paymentFailed, /لم تتغير/);
  });

  it("offers Engineer at SAR 19 with no daily cap and file analysis", () => {
    assert.equal(PLAN_AMOUNTS_SAR.engineer.month, 19);
    assert.match(shellCopy.en.chat.upgradeBody, /19/);
    assert.match(shellCopy.en.chat.upgradeBody, /Word, Excel, and PowerPoint/);
    assert.match(shellCopy.en.chat.upgradeBody, /No daily reply cap/);
    assert.doesNotMatch(shellCopy.en.chat.upgradeBody, /PMO|advisor|export to pdf/i);
    assert.match(shellCopy.ar.chat.upgradeBody, /19/);
    assert.match(shellCopy.ar.chat.upgradeBody, /وورد/);
    const chat = readFileSync("app/chat/page.tsx", "utf8");
    assert.match(chat, /planId="engineer"/);
    assert.match(chat, /BuyPlanButton/);
    assert.doesNotMatch(chat, /gate-btn gate-btn-primary" href="\/pricing"/);
  });
});
