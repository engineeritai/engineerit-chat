// app/api/checkout/moyasar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const { planId } = (await req.json().catch(() => null)) as {
      planId?: PlanId;
    };

    if (!planId) {
      return NextResponse.json({ error: "Missing planId." }, { status: 400 });
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid planId." }, { status: 400 });
    }

    const baseUrl = getBaseUrl();

    // 👇 نضيف plan في رابط النجاح
    const successUrl = `${baseUrl}/payment/success?plan=${planId}`;
    const failUrl = `${baseUrl}/payment/failed`;

    // عدّل amount حسب إعدادك (هنا افتراض أنه موجود في plan)
    const amountHalalas = plan.amountHalalas ?? 0; // غيّرها لو عندك اسم ثاني

    const payload = {
      amount: amountHalalas,
      currency: "SAR",
      description: `Engineerit ${plan.name} plan subscription`,
      callback_url: successUrl,
      success_url: successUrl,
      failure_url: failUrl,
    };

    const moyasarSecretKey = process.env.MOYASAR_SECRET_KEY;
    if (!moyasarSecretKey) {
      return NextResponse.json(
        { error: "Missing MOYASAR_SECRET_KEY env." },
        { status: 500 }
      );
    }

    const authHeader = Buffer.from(`${moyasarSecretKey}:`).toString("base64");

    const res = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Moyasar error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to create payment." },
        { status: 500 }
      );
    }

    const data = await res.json();
    // مويسار يرجّع رابط صفحة الدفع في data.url أو data.source.url حسب نوع الإنفويس
    const url = data.url || data.source?.redirect_url;
    if (!url) {
      console.error("Unexpected Moyasar response:", data);
      return NextResponse.json(
        { error: "Payment URL not found in Moyasar response." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Unexpected error in /api/checkout/moyasar:", err);
    return NextResponse.json(
      { error: "Unexpected error while starting payment." },
      { status: 500 }
    );
  }
}
