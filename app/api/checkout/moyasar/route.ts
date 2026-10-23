import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  PLAN_LABELS,
  isSelfServePlan,
  normalizeExtraSeats,
  parseInterval,
  consultantLegacyActive,
  quoteSelfServe,
  type SelfServePlanId,
} from "@/lib/plans";
import { signCheckoutHandoff, verifyCheckoutHandoff } from "@/lib/checkoutHandoff";
import { moyasarKeysError, readMoyasarKeys, readSamsungPayServiceId } from "@/lib/moyasarEnv";
import { cycleCharge, halalasToSar, termsFromSnapshot } from "@/lib/promoCodes";
import { quoteFromInvoice } from "@/lib/promoStore";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function getAppBaseUrl(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = req.nextUrl;
  return `${url.protocol}//${url.host}`.replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
  }
  const pay = req.nextUrl.searchParams.get("pay") || "";
  const handoff = pay ? verifyCheckoutHandoff(pay, id) : null;
  const user = await getUserFromRequest(req);
  if (!user && (!handoff || !handoff.ok)) {
    return NextResponse.json(
      { error: "Sign in required.", reason: handoff?.reason || "missing" },
      { status: 401 }
    );
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select(
      "id, plan, billing_interval, amount_sar, amount_halalas, seat_limit, extra_seats, user_id, status, purpose, list_amount_sar, list_amount_halalas, discount_sar, discount_halalas, promo_code, promo_cycles"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const owner = Boolean(user && data && data.user_id === user.id);
  const phone = Boolean(handoff?.ok && data);
  if (!data || (!owner && !phone)) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }
  if (req.nextUrl.searchParams.get("watch") === "1") {
    return NextResponse.json({ status: data.status });
  }
  const base = getAppBaseUrl(req);
  const keys = readMoyasarKeys();
  const callback = new URL(`${base}/checkout/return`);
  callback.searchParams.set("checkout", id);
  if (pay && handoff?.ok) callback.searchParams.set("pay", pay);
  const signed = owner ? signCheckoutHandoff(id) : null;
  const phonePay = signed ? new URL(`${base}/checkout/${id}`) : null;
  if (phonePay && signed) phonePay.searchParams.set("pay", signed.token);
  return NextResponse.json({
    checkout: {
      id: data.id,
      plan: data.plan,
      billing_interval: data.billing_interval,
      ...quoteFromInvoice(data),
      seat_limit: data.seat_limit,
      extra_seats: data.extra_seats,
      status: data.status,
      purpose: data.purpose,
    },
    publishableKey: keys.publishable,
    callbackUrl: callback.toString(),
    description: `engineerit.ai ${data.plan} plan`,
    samsungPayServiceId: readSamsungPayServiceId(),
    phonePayUrl: phonePay ? phonePay.toString() : "",
    phonePayExpiresAt: signed?.expiresAt || "",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { planId?: string; interval?: string; extraSeats?: number; purpose?: string; locale?: string }
      | null;
    const locale = body?.locale === "ar" ? "ar" : "en";
    const renewNow = body?.purpose === "renew_now";

    const planId = body?.planId;
    if (!renewNow && (!planId || !isSelfServePlan(planId))) {
      return NextResponse.json(
        { error: "Invalid or missing planId." },
        { status: 400 }
      );
    }

    const keys = readMoyasarKeys();
    if (keys.missing.length > 0) {
      return NextResponse.json({ error: moyasarKeysError(keys.missing) }, { status: 500 });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const admin = getSupabaseAdmin();
    if (renewNow) {
      const { data: sub, error: subErr } = await admin
        .from("billing_subscriptions")
        .select(
          "plan, billing_interval, extra_seats, status, discount_cycles_remaining, discount_kind, discount_percent, discount_amount_off_sar, promo_code_id, promo_code"
        )
        .eq("user_id", user.id)
        .in("status", ["active", "past_due"])
        .maybeSingle();
      if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });
      if (!sub || !isSelfServePlan(sub.plan)) {
        return NextResponse.json({ error: "No open subscription to renew." }, { status: 404 });
      }
      const interval = parseInterval(sub.billing_interval);
      let consultantLegacy = false;
      if (sub.plan === "consultant") {
        const { data: profile } = await admin
          .from("profiles")
          .select("consultant_legacy_price_until")
          .eq("id", user.id)
          .maybeSingle();
        consultantLegacy = consultantLegacyActive(profile?.consultant_legacy_price_until);
      }
      const listQuote = quoteSelfServe(sub.plan, interval, normalizeExtraSeats(sub.extra_seats), { consultantLegacy });
      const cycle = cycleCharge(
        listQuote.amountHalalas,
        Number(sub.discount_cycles_remaining || 0),
        termsFromSnapshot(sub)
      );
      const quote = {
        ...listQuote,
        amountSar: halalasToSar(cycle.chargeHalalas),
        amountHalalas: cycle.chargeHalalas,
      };
      const checkoutId = crypto.randomUUID();
      const baseUrl = getAppBaseUrl(req);
      const pageUrl = `${baseUrl}/checkout/${checkoutId}`;
      const { error: insertErr } = await admin.from("moyasar_invoices").insert({
        id: checkoutId,
        invoice_id: null,
        plan: quote.planId,
        billing_interval: quote.interval,
        amount_sar: quote.amountSar,
        amount_halalas: quote.amountHalalas,
        list_amount_sar: listQuote.amountSar,
        list_amount_halalas: listQuote.amountHalalas,
        discount_sar: halalasToSar(cycle.discountHalalas),
        discount_halalas: cycle.discountHalalas,
        promo_code_id: cycle.discounted ? sub.promo_code_id || null : null,
        promo_code: cycle.discounted ? sub.promo_code || null : null,
        promo_cycles: cycle.discounted ? Number(sub.discount_cycles_remaining || 0) : null,
        discount_kind: cycle.discounted ? sub.discount_kind || null : null,
        discount_percent: cycle.discounted ? sub.discount_percent ?? null : null,
        discount_amount_off_sar: cycle.discounted ? sub.discount_amount_off_sar ?? null : null,
        currency: "SAR",
        seat_limit: quote.seatLimit,
        extra_seats: quote.extraSeats,
        customer_email: user.email?.toLowerCase() || null,
        user_id: user.id,
        payment_url: pageUrl,
        purpose: "renew_now",
        locale,
        status: "pending",
      });
      if (insertErr) {
        console.error("moyasar renew insert", insertErr);
        return NextResponse.json({ error: "Could not start the renewal payment." }, { status: 500 });
      }
      return NextResponse.json({
        url: pageUrl,
        checkoutId,
        amountHalalas: quote.amountHalalas,
        callbackUrl: `${baseUrl}/checkout/return?checkout=${checkoutId}`,
      });
    }

    const interval = parseInterval(body?.interval);
    let consultantLegacy = false;
    if (planId === "consultant") {
      const { data: profile } = await admin
        .from("profiles")
        .select("consultant_legacy_price_until")
        .eq("id", user.id)
        .maybeSingle();
      consultantLegacy = consultantLegacyActive(profile?.consultant_legacy_price_until);
    }
    const quote = quoteSelfServe(planId as SelfServePlanId, interval, normalizeExtraSeats(body?.extraSeats), {
      consultantLegacy,
    });
    const label = PLAN_LABELS[quote.planId];
    const periodLabel = interval === "year" ? "yearly" : "monthly";
    const seated = quote.planId === "team" || quote.planId === "enterprise";
    const seatNote = seated ? `, ${quote.seatLimit} seats` : "";
    const description = `engineerit.ai ${label} plan (SAR ${quote.amountSar} ${periodLabel}${seatNote})`;
    const checkoutId = crypto.randomUUID();
    const baseUrl = getAppBaseUrl(req);
    const pageUrl = `${baseUrl}/checkout/${checkoutId}`;

    const { error: insertErr } = await admin.from("moyasar_invoices").insert({
      id: checkoutId,
      invoice_id: null,
      plan: quote.planId,
      billing_interval: quote.interval,
      amount_sar: quote.amountSar,
      amount_halalas: quote.amountHalalas,
      list_amount_sar: quote.amountSar,
      list_amount_halalas: quote.amountHalalas,
      discount_sar: 0,
      discount_halalas: 0,
      currency: "SAR",
      seat_limit: quote.seatLimit,
      extra_seats: quote.extraSeats,
      customer_email: user.email?.toLowerCase() || null,
      user_id: user.id,
      payment_url: pageUrl,
      purpose: "checkout",
      locale,
      status: "pending",
    });

    if (insertErr) {
      console.error("moyasar invoice insert", insertErr);
      return NextResponse.json(
        { error: "Invoice was created but could not be stored." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: pageUrl,
      checkoutId,
      amountHalalas: quote.amountHalalas,
      description,
      callbackUrl: `${baseUrl}/checkout/return?checkout=${checkoutId}`,
    });
  } catch (err) {
    console.error("Unexpected error in Moyasar checkout route:", err);
    const message = err instanceof Error ? err.message : "Unexpected error while creating payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
