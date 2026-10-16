import { NextResponse } from "next/server";
import {
  extractCheckoutId,
  extractInvoiceId,
  verifyMoyasarSecretToken,
  verifyMoyasarSignature,
} from "@/lib/moyasar";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { confirmStoredInvoice, loadCheckoutById, loadCheckoutByInvoice } from "@/lib/settlePayment";

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

  if (signature && !verifyMoyasarSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (token && !verifyMoyasarSecretToken(token, secret)) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const invoiceId = extractInvoiceId(body);
    const checkoutId = extractCheckoutId(body);
    const row = invoiceId
      ? await loadCheckoutByInvoice(admin, invoiceId)
      : checkoutId
        ? await loadCheckoutById(admin, checkoutId)
        : null;

    if (!row) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await confirmStoredInvoice(admin, row);
    if (!result.ok) {
      return NextResponse.json({ ok: true, pending: true, reason: result.reason });
    }
    return NextResponse.json({ ok: true, plan: result.plan });
  } catch (err) {
    console.error("Moyasar callback error", err);
    return NextResponse.json({ error: "Could not confirm payment." }, { status: 500 });
  }
}
