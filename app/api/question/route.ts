import crypto from "crypto";
import { NextResponse } from "next/server";
import { PROMO_PLANS, isPromoCodeShape, randomPromoCode } from "@/lib/promoCodes";
import { isSelfServePlan, type BillingInterval, type SelfServePlanId } from "@/lib/plans";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

type Choice = { id: string; en: string; ar: string };

function asChoices(value: unknown): Choice[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { id?: unknown; en?: unknown; ar?: unknown };
    const id = String(row.id || "").trim();
    const en = String(row.en || "").trim();
    const ar = String(row.ar || "").trim();
    if (!id || !en || !ar) return [];
    return [{ id, en, ar }];
  });
}

function publicQuestion(row: Record<string, unknown>, locale: "en" | "ar") {
  const choices = asChoices(row.choices).map((choice) => ({
    id: choice.id,
    label: locale === "ar" ? choice.ar : choice.en,
  }));
  return {
    id: row.id,
    question: locale === "ar" ? row.question_ar : row.question_en,
    choices,
    endsAt: row.ends_at,
    rewardPercent: row.reward_percent,
    participationOnly: row.participation_only === true,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("weekly_questions")
    .select("id, question_en, question_ar, choices, reward_percent, participation_only, ends_at, starts_at, status")
    .eq("status", "active")
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ question: null });

  const user = await getUserFromRequest(req);
  let attempt: { correct: boolean; code: string | null } | null = null;
  if (user) {
    const { data: existing } = await admin
      .from("weekly_question_attempts")
      .select("correct, promo_code_id")
      .eq("question_id", data.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      let code: string | null = null;
      if (existing.promo_code_id) {
        const { data: promo } = await admin.from("promo_codes").select("code").eq("id", existing.promo_code_id).maybeSingle();
        code = promo?.code || null;
      }
      attempt = { correct: existing.correct === true, code };
    }
  }
  return NextResponse.json({ question: publicQuestion(data, locale), attempt });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    questionId?: string;
    choiceId?: string;
    locale?: string;
  } | null;
  const questionId = (body?.questionId || "").trim();
  const choiceId = (body?.choiceId || "").trim();
  const locale = body?.locale === "ar" ? "ar" : "en";
  if (!/^[0-9a-f-]{36}$/i.test(questionId) || !choiceId) {
    return NextResponse.json({ error: "Choose an answer." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date();
  const { data: question, error } = await admin
    .from("weekly_questions")
    .select("id, choices, reward_percent, participation_only, code_valid_days, plans, intervals, cycle_count, starts_at, ends_at, status")
    .eq("id", questionId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!question || question.status !== "active") {
    return NextResponse.json({ error: "This question is closed." }, { status: 404 });
  }
  const starts = new Date(question.starts_at);
  const ends = new Date(question.ends_at);
  if (now < starts || now >= ends) return NextResponse.json({ error: "This question is closed." }, { status: 404 });

  const choices = asChoices(question.choices);
  if (!choices.some((choice) => choice.id === choiceId)) {
    return NextResponse.json({ error: "Choose an answer." }, { status: 400 });
  }

  const { data: answer } = await admin
    .from("weekly_question_answers")
    .select("choice_id")
    .eq("question_id", questionId)
    .maybeSingle();
  const correct = answer?.choice_id === choiceId;
  const rewarded = question.participation_only === true || correct;

  const { data: existing } = await admin
    .from("weekly_question_attempts")
    .select("correct, promo_code_id")
    .eq("question_id", questionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    const code = await codeFor(admin, existing.promo_code_id);
    return NextResponse.json({
      already: true,
      correct: existing.correct === true,
      rewarded: Boolean(code),
      code,
      rewardPercent: question.reward_percent,
    });
  }

  const { data: inserted, error: insertErr } = await admin
    .from("weekly_question_attempts")
    .insert({
      question_id: questionId,
      user_id: user.id,
      choice_id: choiceId,
      correct,
    })
    .select("id")
    .maybeSingle();
  if (insertErr || !inserted) {
    const { data: raced } = await admin
      .from("weekly_question_attempts")
      .select("correct, promo_code_id")
      .eq("question_id", questionId)
      .eq("user_id", user.id)
      .maybeSingle();
    const code = await codeFor(admin, raced?.promo_code_id);
    return NextResponse.json({
      already: true,
      correct: raced?.correct === true,
      rewarded: Boolean(code),
      code,
      rewardPercent: question.reward_percent,
    });
  }

  let code: string | null = null;
  let expiresAt: string | null = null;
  if (rewarded) {
    const issued = await issueReward(admin, {
      userId: user.id,
      questionId,
      rewardPercent: Number(question.reward_percent) || 10,
      validDays: Number(question.code_valid_days) || 14,
      plans: Array.isArray(question.plans) ? question.plans.map(String) : [],
      intervals: Array.isArray(question.intervals) ? question.intervals.map(String) : [],
      cycleCount: Number(question.cycle_count) || 1,
      now,
    });
    code = issued.code;
    expiresAt = issued.expiresAt;
    if (issued.id) {
      await admin.from("weekly_question_attempts").update({ promo_code_id: issued.id }).eq("id", inserted.id);
    }
  }

  return NextResponse.json({
    already: false,
    correct,
    rewarded: Boolean(code),
    code,
    expiresAt,
    rewardPercent: question.reward_percent,
    locale,
  });
}

async function codeFor(admin: ReturnType<typeof getSupabaseAdmin>, promoId: string | null | undefined) {
  if (!promoId) return null;
  const { data } = await admin.from("promo_codes").select("code").eq("id", promoId).maybeSingle();
  return data?.code || null;
}

async function issueReward(
  admin: ReturnType<typeof getSupabaseAdmin>,
  args: {
    userId: string;
    questionId: string;
    rewardPercent: number;
    validDays: number;
    plans: string[];
    intervals: string[];
    cycleCount: number;
    now: Date;
  }
) {
  const plans = args.plans.filter((plan): plan is SelfServePlanId => isSelfServePlan(plan));
  const intervals = args.intervals.filter((interval): interval is BillingInterval => interval === "month" || interval === "year");
  const expires = new Date(args.now.getTime() + args.validDays * 24 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bytes = crypto.randomBytes(8);
    const code = randomPromoCode("Q", (index) => bytes[index] ?? 0, 8);
    if (!isPromoCodeShape(code)) continue;
    const { data, error } = await admin
      .from("promo_codes")
      .insert({
        code,
        kind: "percent",
        percent_off: Math.min(100, Math.max(1, Math.round(args.rewardPercent))),
        plans: plans.length > 0 ? plans : PROMO_PLANS,
        intervals: intervals.length > 0 ? intervals : ["month", "year"],
        cycle_count: Math.min(36, Math.max(1, args.cycleCount)),
        starts_at: args.now.toISOString(),
        expires_at: expires.toISOString(),
        max_uses: 1,
        one_per_user: true,
        audience: "user",
        restricted_user_id: args.userId,
        status: "active",
        source: "question",
        weekly_question_id: args.questionId,
        note: "Question of the week",
      })
      .select("id, code")
      .maybeSingle();
    if (!error && data?.id) return { id: data.id as string, code: data.code as string, expiresAt: expires.toISOString() };
  }
  return { id: null, code: null, expiresAt: null };
}
