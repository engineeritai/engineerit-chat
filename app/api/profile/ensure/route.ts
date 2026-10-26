import { NextResponse } from "next/server";
import { newProfileRow, withoutTermsColumns } from "@/lib/ensureProfile";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import { missingTermsColumn, profileTermsFromMetadata } from "@/lib/termsAcceptance";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Could not read the profile." }, { status: 500 });
    if (data?.id) {
      const terms = profileTermsFromMetadata(user.user_metadata, new Date().toISOString());
      if (terms) {
        const { error: termsError } = await admin
          .from("profiles")
          .update(terms)
          .eq("id", user.id)
          .is("terms_accepted_at", null);
        if (termsError && missingTermsColumn(termsError.message || "")) {
          console.warn("terms acceptance skipped; profiles.terms_accepted_at is not on this database yet");
        } else if (termsError) {
          console.error("terms acceptance", termsError.message);
        }
      }
      return NextResponse.json({ ok: true, created: false });
    }

    const row = newProfileRow(user);
    let { error: insertError } = await admin.from("profiles").insert(row);
    if (insertError && missingTermsColumn(insertError.message || "")) {
      console.warn("terms acceptance skipped; profiles.terms_accepted_at is not on this database yet");
      const retry = await admin.from("profiles").insert(withoutTermsColumns(row));
      insertError = retry.error;
    }
    if (insertError && !/duplicate|unique/i.test(insertError.message || "")) {
      return NextResponse.json({ error: "Could not create the profile." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: !insertError });
  } catch (err) {
    console.error("ensure profile", err);
    return NextResponse.json({ error: "Could not create the profile." }, { status: 500 });
  }
}
