import { NextResponse } from "next/server";
import { verifyMoyasarSecretToken, verifyMoyasarSignature, webhookCheckoutLookup } from "@/lib/moyasar";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { confirmCheckout, loadCheckoutById, loadCheckoutByInvoice } from "@/lib/settlePayment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  const signature = req.headers.get("x-moyasar-signature");
  const token =
    body && typeof body === "object" && "secret_token" in body
      ? String((body as { secret_token?: unknown }).secret_token || "")
      : "";

  if (!secret) {
    return NextResponse.json({ error: "MOYASAR_WEBHOOK_SECRET is not set." }, { status: 401 });
  }
  const signatureOk = signature ? verifyMoyasarSignature(raw, signature, secret) : false;
  const tokenOk = token ? verifyMoyasarSecretToken(token, secret) : false;
  if (!signatureOk && !tokenOk) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const target = webhookCheckoutLookup(body);
    let row = target.checkoutId ? await loadCheckoutById(admin, target.checkoutId) : null;
    if (!row && target.invoiceId) row = await loadCheckoutByInvoice(admin, target.invoiceId);

    if (!row) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await confirmCheckout(admin, row, target.paymentId || row.payment_id);
    if (!result.ok) {
      return NextResponse.json({ ok: true, pending: true, reason: result.reason });
    }
    return NextResponse.json({ ok: true, plan: result.plan });
  } catch (err) {
    console.error("Moyasar callback error", err);
    return NextResponse.json({ error: "Could not confirm payment." }, { status: 500 });
  }
}
