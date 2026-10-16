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
import { moyasarKeysError, readMoyasarKeys } from "@/lib/moyasarEnv";
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
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select("id, plan, billing_interval, amount_sar, amount_halalas, seat_limit, extra_seats, user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.user_id !== user.id) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }
  const base = getAppBaseUrl(req);
  const keys = readMoyasarKeys();
  return NextResponse.json({
    checkout: data,
    publishableKey: keys.publishable,
    callbackUrl: `${base}/checkout/return?checkout=${id}`,
    description: `engineerit.ai ${data.plan} plan`,
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
        .select("plan, billing_interval, extra_seats, status")
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
      const quote = quoteSelfServe(sub.plan, interval, normalizeExtraSeats(sub.extra_seats), { consultantLegacy });
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
