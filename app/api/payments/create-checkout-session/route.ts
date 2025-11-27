import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { planCode, billingCycle }: { planCode: string; billingCycle: "monthly" | "yearly" } =
      await req.json();

    if (!planCode || !billingCycle) {
      return NextResponse.json(
        { error: "Missing planCode or billingCycle" },
        { status: 400 }
      );
    }

    // 1) مصادقة المستخدم عن طريق توكن Supabase من الفرونت
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Invalid user token" },
        { status: 401 }
      );
    }

    // 2) جلب الخطة من Supabase
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, internal_code, plan_name")
      .eq("internal_code", planCode)
      .maybeSingle();

    if (planErr || !plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // priceId من متغيرات البيئة (تضبطها من Stripe Dashboard)
    let priceId: string | null = null;

    if (planCode === "pro" && billingCycle === "monthly") {
      priceId = process.env.STRIPE_PRICE_PRO_MONTHLY || null;
    } else if (planCode === "plus" && billingCycle === "monthly") {
      priceId = process.env.STRIPE_PRICE_PLUS_MONTHLY || null;
    } else if (planCode === "premium" && billingCycle === "monthly") {
      priceId = process.env.STRIPE_PRICE_PREMIUM_MONTHLY || null;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this plan" },
        { status: 500 }
      );
    }

    // 3) إنشاء Stripe customer أو استخدام الموجود
    let stripeCustomerId: string | null = null;

    const { data: existing } = await supabaseAdmin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (existing?.stripe_customer_id) {
      stripeCustomerId = existing.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name:
          (user.user_metadata?.full_name as string | undefined) ||
          undefined,
      });
      stripeCustomerId = customer.id;
    }

    // 4) إنشاء Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?status=cancel`,
      metadata: {
        user_id: user.id,
        plan_code: plan.internal_code,
        billing_cycle: billingCycle,
      },
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("CHECKOUT SESSION ERROR:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
