import { NextRequest, NextResponse } from "next/server";
import {
  PLAN_LABELS,
  isSelfServePlan,
  normalizeExtraSeats,
  parseInterval,
  quoteSelfServe,
  type SelfServePlanId,
} from "@/lib/plans";

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

    const interval = parseInterval(body?.interval);
    const quote = quoteSelfServe(planId as SelfServePlanId, interval, normalizeExtraSeats(body?.extraSeats));
    const label = PLAN_LABELS[quote.planId];
    const periodLabel = interval === "year" ? "yearly" : "monthly";
    const seatNote =
      quote.planId === "team"
        ? `, ${quote.seatLimit} seats`
        : "";
    const description = `engineerit.ai ${label} plan (SAR ${quote.amountSar} ${periodLabel}${seatNote})`;

    const baseUrl = getAppBaseUrl(req);
    const successUrl =
      `${baseUrl}/profile?status=paid&plan=${quote.planId}` +
      `&interval=${quote.interval}&extraSeats=${quote.extraSeats}`;
    const backUrl = `${baseUrl}/pricing`;

    const authHeader = "Basic " + Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: quote.amountHalalas,
        currency: "SAR",
        description,
        success_url: successUrl,
        back_url: backUrl,
        metadata: {
          plan_id: quote.planId,
          plan_label: label,
          billing_interval: quote.interval,
          extra_seats: String(quote.extraSeats),
          seat_limit: String(quote.seatLimit),
          amount_sar: String(quote.amountSar),
          source: "engineerit.ai",
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(async () => ({ message: await response.text().catch(() => "") }));

      const msg =
        (errorBody && (errorBody.message || JSON.stringify(errorBody))) ||
        "Failed to create payment invoice.";

      console.error("Moyasar invoice creation failed:", errorBody);

      return NextResponse.json(
        { error: msg },
        { status: response.status || 502 }
      );
    }

    const invoice = await response.json();
    const paymentUrl = invoice?.url || invoice?.invoice_url;

    if (!paymentUrl) {
      console.error("Moyasar response missing invoice URL:", invoice);
      return NextResponse.json(
        { error: "Payment URL is missing from Moyasar response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: paymentUrl });
  } catch (err) {
    console.error("Unexpected error in Moyasar checkout route:", err);
    return NextResponse.json(
      { error: "Unexpected error while creating payment." },
      { status: 500 }
    );
  }
}
