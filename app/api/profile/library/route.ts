import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

/** Read-only profile library. Does not create charges or change a subscription. */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();

  const [conversations, messages, subscriptions, invoices] = await Promise.all([
    admin
      .from("conversations")
      .select("id, title, discipline, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100),
    admin
      .from("messages")
      .select("id, conversation_id, attachments, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(400),
    admin
      .from("billing_subscriptions")
      .select(
        "id, plan, billing_interval, amount_sar, status, current_period_start, current_period_end, cancel_at_period_end, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("moyasar_invoices")
      .select("id, plan, billing_interval, amount_sar, status, paid_at, created_at, period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const error =
    conversations.error?.message ||
    messages.error?.message ||
    subscriptions.error?.message ||
    invoices.error?.message;
  if (error) return NextResponse.json({ error }, { status: 500 });

  const files = (messages.data || []).flatMap((row) => {
    const list = Array.isArray(row.attachments) ? row.attachments : [];
    return list.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const raw = item as Record<string, unknown>;
      const name = String(raw.name || "").trim();
      if (!name) return [];
      return [
        {
          id: `${row.id}-${index}`,
          conversationId: row.conversation_id,
          name,
          size: typeof raw.size === "number" ? raw.size : null,
          createdAt: row.created_at,
        },
      ];
    });
  });

  return NextResponse.json({
    conversations: conversations.data || [],
    files,
    subscriptions: subscriptions.data || [],
    invoices: invoices.data || [],
  });
}
