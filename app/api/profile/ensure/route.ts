import { NextResponse } from "next/server";
import { newProfileRow } from "@/lib/ensureProfile";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Could not read the profile." }, { status: 500 });
    if (data?.id) return NextResponse.json({ ok: true, created: false });

    const { error: insertError } = await admin.from("profiles").insert(newProfileRow(user));
    if (insertError && !/duplicate|unique/i.test(insertError.message || "")) {
      return NextResponse.json({ error: "Could not create the profile." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: !insertError });
  } catch (err) {
    console.error("ensure profile", err);
    return NextResponse.json({ error: "Could not create the profile." }, { status: 500 });
  }
}
