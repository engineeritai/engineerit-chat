import { NextResponse } from "next/server";
import { verifyCheckoutHandoff } from "@/lib/checkoutHandoff";
import { applyPromoCode, removePromoCode } from "@/lib/promoStore";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import { loadCheckoutById, settleFreeCheckout } from "@/lib/settlePayment";

export const runtime = "nodejs";

const REASONS = new Set([
  "empty",
  "not_found",
  "disabled",
  "not_started",
  "expired",
  "wrong_plan",
  "wrong_interval",
  "wrong_domain",
  "wrong_user",
  "not_lapsed",
  "already_used",
  "maxed",
  "below_minimum",
  "not_free",
]);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    checkoutId?: string;
    action?: string;
    code?: string;
    pay?: string;
    amountHalalas?: number;
  } | null;
  const checkoutId = (body?.checkoutId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(checkoutId)) {
    return NextResponse.json({ error: "Missing checkout.", reason: "not_found" }, { status: 400 });
  }
  const pay = (body?.pay || "").trim();
  const handoff = pay ? verifyCheckoutHandoff(pay, checkoutId) : null;
  const user = await getUserFromRequest(req);
  if (!user && !handoff?.ok) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const row = await loadCheckoutById(admin, checkoutId);
  if (!row) return NextResponse.json({ error: "Checkout not found.", reason: "not_found" }, { status: 404 });
  const owner = Boolean(user && row.user_id === user.id);
  if (!owner && !handoff?.ok) {
    return NextResponse.json({ error: "Checkout not found.", reason: "not_found" }, { status: 404 });
  }
  if (!row.user_id) {
    return NextResponse.json({ error: "Checkout not found.", reason: "wrong_user" }, { status: 404 });
  }

  const action = body?.action === "remove" || body?.action === "activate" ? body.action : "apply";
  try {
    if (action === "remove" && row.purpose === "renew_now") {
      return NextResponse.json({ error: "This renewal discount stays on the subscription.", reason: "already_used" }, { status: 409 });
    }
    if (action === "apply" && row.purpose === "renew_now" && row.promo_code_id) {
      return NextResponse.json({ error: "This renewal already has its discount.", reason: "already_used" }, { status: 409 });
    }
    if (action === "remove") {
      const removed = await removePromoCode(admin, row);
      if (!removed.ok) {
        return NextResponse.json({ error: "This checkout is already paid.", reason: removed.reason }, { status: 409 });
      }
      return NextResponse.json({ ok: true, quote: removed.quote });
    }
    if (action === "activate") {
      const result = await settleFreeCheckout(admin, row);
      if (!result.ok) {
        return NextResponse.json({ error: "This checkout is not a free code.", reason: result.reason }, { status: 409 });
      }
      return NextResponse.json({ ok: true, free: true, plan: result.plan });
    }
    const applied = await applyPromoCode(admin, {
      invoice: row,
      code: body?.code || "",
      claimedHalalas: body?.amountHalalas,
    });
    if (!applied.ok) {
      const reason = REASONS.has(applied.reason) ? applied.reason : "not_found";
      return NextResponse.json({ error: "Code was not applied.", reason }, { status: 400 });
    }
    return NextResponse.json({ ok: true, quote: applied.quote });
  } catch (err) {
    console.error("checkout promo", err);
    return NextResponse.json({ error: "Could not apply the code." }, { status: 500 });
  }
}
