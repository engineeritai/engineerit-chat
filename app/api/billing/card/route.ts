import { NextResponse } from "next/server";
import { saveCardFromPayment } from "@/lib/billingAccount";
import { assessPaidInvoice, fetchMoyasarPayment } from "@/lib/moyasar";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

const VERIFY_HALALAS = 100;

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { paymentId?: string } | null;
  const paymentId = (body?.paymentId || "").trim();
  if (!paymentId) return NextResponse.json({ error: "Missing payment." }, { status: 400 });

  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "MOYASAR_SECRET_KEY is not set." }, { status: 500 });

  try {
    const payment = await fetchMoyasarPayment(secret, paymentId);
    const assessment = assessPaidInvoice(VERIFY_HALALAS, payment);
    if (!assessment.ok) {
      return NextResponse.json({ error: "Card verification is not paid yet." }, { status: 409 });
    }
    if (payment.metadata?.purpose !== "card_update" || payment.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "This payment is not a card update for your account." }, { status: 403 });
    }
    const admin = getSupabaseAdmin();
    const { data: sub } = await admin
      .from("billing_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .maybeSingle();
    await saveCardFromPayment(admin, {
      userId: user.id,
      payment,
      billingSubscriptionId: (sub?.id as string | undefined) || null,
    });
    return NextResponse.json({ ok: true, lastFour: payment.source?.number || null });
  } catch (err) {
    console.error("card update", err);
    return NextResponse.json({ error: "Could not save the card." }, { status: 500 });
  }
}
