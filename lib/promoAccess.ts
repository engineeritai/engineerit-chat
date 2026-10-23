import { verifyCheckoutHandoff } from "@/lib/checkoutHandoff";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import { isAdminEmail } from "@/lib/admin";

export async function requireAdmin(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

export async function checkoutActor(req: Request, checkoutId: string, payToken: string) {
  const handoff = payToken ? verifyCheckoutHandoff(payToken, checkoutId) : null;
  const user = await getUserFromRequest(req);
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select("user_id")
    .eq("id", checkoutId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.user_id) return { ok: false as const, status: 404, error: "Checkout not found." };
  const owner = Boolean(user && data.user_id === user.id);
  const phone = Boolean(handoff?.ok);
  if (!owner && !phone) {
    if (!user) return { ok: false as const, status: 401, error: "Sign in required." };
    return { ok: false as const, status: 403, error: "Checkout not found." };
  }
  return { ok: true as const, userId: String(data.user_id), admin };
}
