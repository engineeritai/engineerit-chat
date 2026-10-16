import { NextResponse } from "next/server";
import { prorateSeatChange, seatChangeIdempotencyKey } from "@/lib/billingCycle";
import { extraSeatPrice, includedSeats, normalizeExtraSeats, quoteSelfServe, type BillingInterval, type SelfServePlanId } from "@/lib/plans";
import { chargeSeatChange, type OpenSubscription } from "@/lib/renewals";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { extraSeats?: number } | null;
  const nextExtra = normalizeExtraSeats(body?.extraSeats);

  const admin = getSupabaseAdmin();
  const { data: sub, error } = await admin
    .from("billing_subscriptions")
    .select(
      "id, user_id, customer_email, plan, billing_interval, extra_seats, seat_limit, amount_halalas, status, current_period_start, current_period_end, cancel_at_period_end, saved_card_id, team_id, credit_halalas, failure_count"
    )
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .in("plan", ["team", "enterprise"])
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sub) return NextResponse.json({ error: "No team subscription." }, { status: 404 });

  const plan = sub.plan as SelfServePlanId;
  const interval = (sub.billing_interval === "year" ? "year" : "month") as BillingInterval;
  const open = sub as OpenSubscription;
  if (nextExtra === open.extra_seats) return NextResponse.json({ ok: true, unchanged: true });

  const { count } = await admin
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", open.team_id)
    .in("status", ["active", "invited"]);
  const nextLimit = includedSeats(plan) + nextExtra;
  if ((count || 0) > nextLimit) {
    return NextResponse.json({ error: "Remove members before lowering the seat count." }, { status: 409 });
  }

  const priced = prorateSeatChange({
    now: new Date(),
    periodStart: new Date(sub.current_period_start as string),
    periodEnd: new Date(open.current_period_end),
    pricePerSeatSar: extraSeatPrice(plan)[interval],
    fromExtra: open.extra_seats,
    toExtra: nextExtra,
  });
  const key = seatChangeIdempotencyKey(open.id, open.current_period_end, open.extra_seats, nextExtra);

  if (priced.amountHalalas > 0) {
    const charge = await chargeSeatChange(admin, open, {
      amountHalalas: priced.amountHalalas,
      idempotencyKey: key,
      description: `engineerit.ai extra seats (${priced.deltaSeats})`,
    });
    if (charge.pending) {
      return NextResponse.json(
        { error: "The card charge is still processing. Wait a minute and submit the same seat change again.", pending: true },
        { status: 409 }
      );
    }
    if (!charge.paid) {
      return NextResponse.json(
        { error: charge.error || "Could not charge the saved card. Update the card and try again.", updateCard: true },
        { status: 402 }
      );
    }
  }

  const quote = quoteSelfServe(plan, interval, nextExtra);
  const nowIso = new Date().toISOString();
  const credit = priced.creditHalalas > 0 ? open.credit_halalas + priced.creditHalalas : open.credit_halalas;
  await admin
    .from("billing_subscriptions")
    .update({
      extra_seats: nextExtra,
      seat_limit: quote.seatLimit,
      amount_sar: quote.amountSar,
      amount_halalas: quote.amountHalalas,
      credit_halalas: credit,
      updated_at: nowIso,
    })
    .eq("id", open.id);
  if (open.team_id) {
    await admin
      .from("teams")
      .update({ extra_seats: nextExtra, seat_limit: quote.seatLimit, updated_at: nowIso })
      .eq("id", open.team_id);
  }
  return NextResponse.json({
    ok: true,
    seatLimit: quote.seatLimit,
    chargedHalalas: Math.max(0, priced.amountHalalas),
    creditHalalas: priced.creditHalalas,
  });
}
