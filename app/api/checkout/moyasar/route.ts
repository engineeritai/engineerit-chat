import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  PLAN_LABELS,
  isSelfServePlan,
  normalizeExtraSeats,
  parseInterval,
  quoteSelfServe,
  type SelfServePlanId,
} from "@/lib/plans";
import { createMoyasarInvoice } from "@/lib/moyasar";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function getAppBaseUrl(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = req.nextUrl;
  return `${url.protocol}//${url.host}`.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { planId?: string; interval?: string; extraSeats?: number }
      | null;

    const planId = body?.planId;
    if (!planId || !isSelfServePlan(planId)) {
      return NextResponse.json(
        { error: "Invalid or missing planId." },
        { status: 400 }
      );
    }

    const secretKey = process.env.MOYASAR_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "MOYASAR_SECRET_KEY is not set in environment." },
        { status: 500 }
      );
    }

    const user = await getUserFromRequest(req);
    const interval = parseInterval(body?.interval);
    const quote = quoteSelfServe(planId as SelfServePlanId, interval, normalizeExtraSeats(body?.extraSeats));
    const label = PLAN_LABELS[quote.planId];
    const periodLabel = interval === "year" ? "yearly" : "monthly";
    const seatNote = quote.planId === "team" ? `, ${quote.seatLimit} seats` : "";
    const description = `engineerit.ai ${label} plan (SAR ${quote.amountSar} ${periodLabel}${seatNote}, VAT included)`;
    const checkoutId = crypto.randomUUID();
    const baseUrl = getAppBaseUrl(req);

    const invoice = await createMoyasarInvoice(secretKey, {
      amount: quote.amountHalalas,
      currency: "SAR",
      description,
      success_url:
        `${baseUrl}/profile?status=paid&plan=${quote.planId}` +
        `&interval=${quote.interval}&extraSeats=${quote.extraSeats}&checkout=${checkoutId}`,
      back_url: `${baseUrl}/pricing`,
      callback_url: `${baseUrl}/api/payments/moyasar/callback`,
      metadata: {
        plan_id: quote.planId,
        plan_label: label,
        billing_interval: quote.interval,
        extra_seats: String(quote.extraSeats),
        seat_limit: String(quote.seatLimit),
        amount_sar: String(quote.amountSar),
        checkout_id: checkoutId,
        customer_email: user?.email || "",
        source: "engineerit.ai",
      },
    });

    const admin = getSupabaseAdmin();
    const { error: insertErr } = await admin.from("moyasar_invoices").insert({
      id: checkoutId,
      invoice_id: invoice.id,
      plan: quote.planId,
      billing_interval: quote.interval,
      amount_sar: quote.amountSar,
      amount_halalas: quote.amountHalalas,
      currency: "SAR",
      seat_limit: quote.seatLimit,
      extra_seats: quote.extraSeats,
      customer_email: user?.email?.toLowerCase() || null,
      user_id: user?.id || null,
      payment_url: invoice.url,
      status: "pending",
    });

    if (insertErr) {
      console.error("moyasar invoice insert", insertErr);
      return NextResponse.json(
        { error: "Invoice was created but could not be stored." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: invoice.url, checkoutId });
  } catch (err) {
    console.error("Unexpected error in Moyasar checkout route:", err);
    const message = err instanceof Error ? err.message : "Unexpected error while creating payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
