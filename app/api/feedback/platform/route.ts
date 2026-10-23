import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { feedbackTableMissing, parsePlatformFeedback } from "@/lib/platformFeedback";
import { getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const parsed = parsePlatformFeedback(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!url || !anon || !token) return NextResponse.json({ error: "auth" }, { status: 401 });

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.from("platform_feedback").insert({
    user_id: user.id,
    rating: parsed.rating,
    liked: parsed.liked,
    improve: parsed.improve,
  });
  if (error) {
    if (feedbackTableMissing(error)) {
      return NextResponse.json({ ok: false, error: "unavailable" }, { status: 409 });
    }
    console.error("platform feedback", error.message);
    return NextResponse.json({ error: "save" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
