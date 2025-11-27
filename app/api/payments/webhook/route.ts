import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: Request) {
  const rawBody = await req.text();

  const signature = req.headers.get("paddle-signature") || "";
  const secret = process.env.PADDLE_WEBHOOK_SECRET!;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (hmac !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (event.event_type === "transaction.completed") {
    const subscriptionId = event.data.subscription_id;
    const priceId = event.data.items[0].price_id;

    await supabase
      .from("profiles")
      .update({
        subscription_tier: priceId,
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.data.customer_id);
  }

  if (event.event_type === "subscription.canceled") {
    await supabase
      .from("profiles")
      .update({ subscription_status: "canceled" })
      .eq("id", event.data.customer_id);
  }

  return NextResponse.json({ received: true });
}
