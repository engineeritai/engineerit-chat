import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const actor = await getUserFromRequest(req);
    if (!actor || !isAdminEmail(actor.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("enterprise_leads")
      .select("id, name, company, email, phone, seats, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ leads: data || [] });
  } catch (err) {
    console.error("GET /api/admin/enterprise-leads", err);
    return NextResponse.json({ error: "Could not load leads." }, { status: 500 });
  }
}
