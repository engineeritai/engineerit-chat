import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type PlanId = "engineer" | "professional" | "consultant";

const PLAN_CONFIG: Record<
  PlanId,
  {
    amount: number;
    label: string;
    description: string;
  }
> = {
  engineer: {
    amount: 19 * 100,
    label: "Engineer",
    description:
      "engineerit.ai Engineer plan (SAR 19 monthly, 10% yearly discount)",
  },
  professional: {
    amount: 41 * 100,
    label: "Professional",
    description:
      "engineerit.ai Professional plan (SAR 41 monthly, 13% yearly discount)",
  },
  consultant: {
    amount: 79 * 100,
    label: "Consultant",
    description:
      "engineerit.ai Consultant plan (SAR 79 monthly, 17% yearly discount)",
  },
};

function getAppBaseUrl(req: NextRequest) {
  // للإنتاج: استخدم متغير بيئة (Vercel)
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // للتجارب على localhost
  const url = req.nextUrl;
  return `${url.protocol}//${url.host}`.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.MOYASAR_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "MOYASAR_SECRET_KEY is not set in environment." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { planId?: PlanId }
      | null;

    const planId = body?.planId;

    if (!planId || !PLAN_CONFIG[planId]) {
      return NextResponse.json(
        { error: "Invalid or missing planId." },
        { status: 400 }
      );
    }

    const { amount, label, description } = PLAN_CONFIG[planId];

    const baseUrl = getAppBaseUrl(req);
    const successUrl = `${baseUrl}/payment/success?plan=${planId}`;
    const backUrl = `${baseUrl}/subscription`;

    const authHeader =
      "Basic " + Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "SAR",
        description,
        success_url: successUrl,
        back_url: backUrl,
        metadata: {
          plan_id: planId,
          plan_label: label,
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
