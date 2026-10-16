import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { periodDays, type BillingInterval } from "@/lib/plans";
import { findUserIdByEmail, recordPlanPurchase } from "@/lib/recordPlan";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await getUserFromRequest(req);
    if (!actor || !isAdminEmail(actor.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as
      | {
          email?: string;
          plan?: string;
          interval?: string;
          seats?: number;
          company?: string;
          amountSar?: number;
          periodEnd?: string;
        }
      | null;

    const email = (body?.email || "").trim().toLowerCase();
    const plan = body?.plan;
    const interval: BillingInterval = body?.interval === "year" ? "year" : "month";
    const seats = Math.floor(Number(body?.seats));
    const company = (body?.company || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter the customer email." }, { status: 400 });
    }
    if (plan !== "team" && plan !== "enterprise") {
      return NextResponse.json({ error: "Plan must be team or enterprise." }, { status: 400 });
    }
    if (!Number.isFinite(seats) || seats < 1 || seats > 10000) {
      return NextResponse.json({ error: "Enter a seat count between 1 and 10000." }, { status: 400 });
    }

    let periodEnd: string | null = null;
    if (body?.periodEnd) {
      const parsed = new Date(body.periodEnd);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid end date." }, { status: 400 });
      }
      periodEnd = parsed.toISOString();
    } else {
      periodEnd = new Date(Date.now() + periodDays(interval) * 24 * 60 * 60 * 1000).toISOString();
    }

    const amountSar = typeof body?.amountSar === "number" ? body.amountSar : undefined;
    if (amountSar !== undefined && (!Number.isFinite(amountSar) || amountSar < 0)) {
      return NextResponse.json({ error: "Amount must be a number of SAR." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const userId = await findUserIdByEmail(admin, email);

    if (!userId) {
      const { error } = await admin.from("pending_plan_grants").insert({
        email,
        plan,
        billing_interval: interval,
        seat_limit: seats,
        amount_sar: amountSar ?? null,
        current_period_end: periodEnd,
        company: company || null,
        created_by: actor.id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        ok: true,
        pending: true,
        message: "No account yet. The plan will activate when this email signs up.",
      });
    }

    const result = await recordPlanPurchase(admin, {
      userId,
      email,
      plan,
      interval,
      seatLimit: seats,
      extraSeats: plan === "team" ? Math.max(0, seats - 5) : 0,
      amountSar,
      periodEnd,
      company: company || null,
      source: "manual",
    });

    return NextResponse.json({ pending: false, ...result });
  } catch (err) {
    console.error("POST /api/admin/activate", err);
    const message = err instanceof Error ? err.message : "Could not activate the subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
