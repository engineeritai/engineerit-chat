import { NextRequest, NextResponse } from "next/server";
import {
  buildRewardCode,
  decideQuestionAttempt,
  gradeWeeklyAnswer,
  publicWeeklyQuestion,
  type WeeklyQuestionRow,
} from "@/lib/promo";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function asChoices(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function asQuestion(row: Record<string, unknown>): WeeklyQuestionRow {
  return {
    id: String(row.id),
    question_en: String(row.question_en || ""),
    question_ar: String(row.question_ar || ""),
    choices_en: asChoices(row.choices_en),
    choices_ar: asChoices(row.choices_ar),
    answer_index: Number(row.answer_index),
    reward_percent: Number(row.reward_percent) || 10,
    participation_only: Boolean(row.participation_only),
    valid_days: Number(row.valid_days) || 7,
    active: row.active !== false,
    published_at: row.published_at ? String(row.published_at) : null,
  };
}

async function currentQuestion(now = new Date()) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("weekly_questions")
    .select(
      "id, question_en, question_ar, choices_en, choices_ar, answer_index, reward_percent, participation_only, valid_days, active, published_at"
    )
    .eq("active", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = asQuestion(data as Record<string, unknown>);
  if (!publicWeeklyQuestion(row, now)) return null;
  return row;
}

export async function GET() {
  try {
    const row = await currentQuestion();
    return NextResponse.json({ question: row ? publicWeeklyQuestion(row) : null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load the question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { questionId?: string; choiceIndex?: number } | null;
  const questionId = body?.questionId || "";
  if (!/^[0-9a-f-]{36}$/i.test(questionId)) {
    return NextResponse.json({ error: "Missing question." }, { status: 400 });
  }
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("weekly_questions")
      .select(
        "id, question_en, question_ar, choices_en, choices_ar, answer_index, reward_percent, participation_only, valid_days, active, published_at"
      )
      .eq("id", questionId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    const row = asQuestion(data as Record<string, unknown>);
    if (!publicWeeklyQuestion(row)) return NextResponse.json({ error: "Question not found." }, { status: 404 });

    const { data: existing, error: existingErr } = await admin
      .from("question_entries")
      .select("correct, rewarded, code_id")
      .eq("question_id", row.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

    let prior: { rewarded: boolean; correct: boolean; code: string | null; expiresAt: string | null } | null = null;
    if (existing) {
      let code: string | null = null;
      let expiresAt: string | null = null;
      if (existing.code_id) {
        const { data: saved } = await admin
          .from("promo_codes")
          .select("code, expires_at")
          .eq("id", existing.code_id)
          .maybeSingle();
        code = saved?.code ? String(saved.code) : null;
        expiresAt = saved?.expires_at ? String(saved.expires_at) : null;
      }
      prior = { rewarded: Boolean(existing.rewarded), correct: Boolean(existing.correct), code, expiresAt };
    }

    const graded = gradeWeeklyAnswer(row, Number(body?.choiceIndex));
    const decision = decideQuestionAttempt(prior, graded);
    if (!decision.ok) return NextResponse.json({ ok: false, reason: decision.reason }, { status: 400 });
    if (decision.already) {
      return NextResponse.json({
        ok: true,
        already: true,
        rewarded: decision.rewarded,
        correct: decision.correct,
        code: decision.code,
        expiresAt: decision.expiresAt,
        percent: row.reward_percent,
      });
    }

    if (!graded.rewarded) {
      const { error: insertErr } = await admin.from("question_entries").insert({
        question_id: row.id,
        user_id: user.id,
        choice_index: Number(body?.choiceIndex),
        correct: false,
        rewarded: false,
      });
      if (insertErr && !insertErr.message.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, rewarded: false, correct: false, code: null });
    }

    const reward = buildRewardCode({
      userId: user.id,
      percent: row.reward_percent,
      validDays: row.valid_days,
      questionId: row.id,
    });
    const { data: created, error: codeErr } = await admin.from("promo_codes").insert(reward).select("id, code, expires_at").single();
    if (codeErr || !created) return NextResponse.json({ error: codeErr?.message || "Could not create the code." }, { status: 500 });
    const { error: entryErr } = await admin.from("question_entries").insert({
      question_id: row.id,
      user_id: user.id,
      choice_index: Number(body?.choiceIndex),
      correct: graded.correct,
      rewarded: true,
      code_id: created.id,
    });
    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 });
    return NextResponse.json({
      ok: true,
      rewarded: true,
      correct: graded.correct,
      code: created.code,
      expiresAt: created.expires_at,
      percent: row.reward_percent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
