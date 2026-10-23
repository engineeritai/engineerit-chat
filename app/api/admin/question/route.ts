import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function cleanChoices(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6);
}

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("weekly_questions")
    .select(
      "id, question_en, question_ar, choices_en, choices_ar, answer_index, reward_percent, participation_only, valid_days, active, published_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true, questions: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ questions: data || [] });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing question." }, { status: 400 });
  const questionEn = typeof body.questionEn === "string" ? body.questionEn.trim() : "";
  const questionAr = typeof body.questionAr === "string" ? body.questionAr.trim() : "";
  const choicesEn = cleanChoices(body.choicesEn);
  const choicesAr = cleanChoices(body.choicesAr);
  const answerIndex = Math.floor(Number(body.answerIndex));
  const rewardPercent = Math.floor(Number(body.rewardPercent ?? 10));
  const validDays = Math.floor(Number(body.validDays ?? 7));
  if (questionEn.length < 8 || questionAr.length < 8) {
    return NextResponse.json({ error: "Write the question in English and Arabic." }, { status: 400 });
  }
  if (choicesEn.length < 2 || choicesEn.length !== choicesAr.length) {
    return NextResponse.json({ error: "Add the same number of English and Arabic choices, at least two." }, { status: 400 });
  }
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choicesEn.length) {
    return NextResponse.json({ error: "Pick the correct choice." }, { status: 400 });
  }
  if (rewardPercent < 1 || rewardPercent > 100 || validDays < 1 || validDays > 90) {
    return NextResponse.json({ error: "Reward percent is 1 to 100 and the code lasts 1 to 90 days." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  if (body.active !== false) {
    await admin.from("weekly_questions").update({ active: false }).eq("active", true);
  }
  const { data, error } = await admin
    .from("weekly_questions")
    .insert({
      question_en: questionEn,
      question_ar: questionAr,
      choices_en: choicesEn,
      choices_ar: choicesAr,
      answer_index: answerIndex,
      reward_percent: rewardPercent,
      participation_only: Boolean(body.participationOnly),
      valid_days: validDays,
      active: body.active !== false,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
