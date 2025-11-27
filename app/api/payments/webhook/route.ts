import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("WEBHOOK SIGNATURE ERROR:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        const userId = session.metadata?.user_id;
        const planCode = session.metadata?.plan_code;
        const billingCycle = (session.metadata?.billing_cycle as
          | "monthly"
          | "yearly") ?? "monthly";

        if (!userId || !planCode || !subscriptionId || !customerId) {
          console.error("Missing metadata in session");
          break;
        }

        const { data: plan, error: planErr } = await supabaseAdmin
          .from("subscription_plans")
          .select("id")
          .eq("internal_code", planCode)
          .maybeSingle();

        if (planErr || !plan) {
          console.error("Plan not found for webhook");
          break;
        }

        // upsert اشتراك المستخدم
        await supabaseAdmin.from("user_subscriptions").upsert(
          {
            user_id: userId,
            plan_id: plan.id,
            billing_cycle: billingCycle,
            status: "active",
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            start_date: new Date().toISOString(),
            auto_renew: true,
          },
          {
            onConflict: "user_id",
          }
        );

        // تحديث tier في profiles
        await supabaseAdmin
          .from("profiles")
          .update({ subscription_tier: planCode })
          .eq("id", userId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: subRow } = await supabaseAdmin
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (subRow?.user_id) {
          await supabaseAdmin
            .from("user_subscriptions")
            .update({
              status: "canceled",
              end_date: new Date().toISOString(),
              auto_renew: false,
            })
            .eq("stripe_subscription_id", subscription.id);

          await supabaseAdmin
            .from("profiles")
            .update({ subscription_tier: "assistant" })
            .eq("id", subRow.user_id);
        }

        break;
      }

      default:
        // تجاهل بقية الأحداث الآن
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("WEBHOOK HANDLER ERROR:", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }
}
