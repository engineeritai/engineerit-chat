import { NextResponse } from "next/server";
import { canDownloadInvoice } from "@/lib/invoiceMail";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Missing invoice." }, { status: 400 });
  }
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select("id, user_id, plan, billing_interval, amount_sar, seat_limit, paid_at, period_end, status, locale")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || !canDownloadInvoice(user.id, data.user_id, data.status)) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  return NextResponse.json({
    invoice: {
      id: data.id,
      plan: data.plan,
      billing_interval: data.billing_interval,
      amount_sar: data.amount_sar,
      seat_limit: data.seat_limit,
      paid_at: data.paid_at,
      period_end: data.period_end,
      status: data.status,
      locale: data.locale,
    },
  });
}
