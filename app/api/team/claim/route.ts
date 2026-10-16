import { NextResponse } from "next/server";
import { claimAccessForUser } from "@/lib/teamClaim";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const result = await claimAccessForUser(getSupabaseAdmin(), {
      id: user.id,
      email: user.email,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/team/claim", err);
    const message = err instanceof Error ? err.message : "Could not claim team access.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
