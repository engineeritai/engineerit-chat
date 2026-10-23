import crypto from "crypto";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import {
  PROMO_PLANS,
  isPromoCodeShape,
  randomPromoCode,
  validatePromoDraft,
  type NormalizedPromoDraft,
  type PromoAudience,
  type PromoKind,
} from "@/lib/promoCodes";
import { isSelfServePlan, type BillingInterval, type SelfServePlanId } from "@/lib/plans";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

async function requireOwner(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

function riyadhIso(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00+03:00`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function GET(req: Request) {
  const user = await requireOwner(req);
  if (!user) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const admin = getSupabaseAdmin();
  const [codes, redemptions, questions, answers] = await Promise.all([
    admin.from("promo_codes").select("*").order("created_at", { ascending: false }).limit(200),
    admin
      .from("promo_redemptions")
      .select("id, promo_code_id, user_id, invoice_id, email, status, created_at, redeemed_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("weekly_questions").select("*").order("starts_at", { ascending: false }).limit(20),
    admin.from("weekly_question_answers").select("question_id, choice_id"),
  ]);
  const answerByQuestion = new Map((answers.data || []).map((row) => [row.question_id, row.choice_id]));
  return NextResponse.json({
    codes: codes.data || [],
    redemptions: redemptions.data || [],
    questions: (questions.data || []).map((row) => ({ ...row, answer_choice_id: answerByQuestion.get(row.id) || "" })),
    errors: [codes.error?.message, redemptions.error?.message, questions.error?.message, answers.error?.message].filter(Boolean),
  });
}

export async function POST(req: Request) {
  const user = await requireOwner(req);
  if (!user) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action || "");
  const admin = getSupabaseAdmin();
  try {
    if (action === "disable") {
      const id = String(body?.id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Missing code." }, { status: 400 });
      const { error } = await admin.from("promo_codes").update({ status: "disabled" }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === "batch" || action === "question") {
      const result = action === "batch" ? await createBatch(admin, user.id, body || {}) : await saveQuestion(admin, user.id, body || {});
      if ("error" in result && result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json(result);
    }
    if (action === "close-question") {
      const id = String(body?.id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Missing question." }, { status: 400 });
      const { error } = await admin.from("weekly_questions").update({ status: "closed" }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    const draft = validatePromoDraft({
      code: String(body?.code || ""),
      kind: String(body?.kind || "") as PromoKind,
      percentOff: numberOrNull(body?.percentOff),
      amountOffSar: numberOrNull(body?.amountOffSar),
      freeMonths: numberOrNull(body?.freeMonths),
      plans: stringList(body?.plans),
      intervals: stringList(body?.intervals),
      cycleCount: numberOrNull(body?.cycleCount),
      startsAt: riyadhIso(body?.startsAt) || new Date().toISOString(),
      expiresAt: riyadhIso(body?.expiresAt),
      maxUses: numberOrNull(body?.maxUses),
      onePerUser: body?.onePerUser !== false,
      audience: (String(body?.audience || "any") as PromoAudience),
      emailDomains: stringList(body?.emailDomains),
      note: String(body?.note || ""),
    });
    if (!draft.ok) return NextResponse.json({ error: draft.error }, { status: 400 });
    const { error } = await admin.from("promo_codes").insert({
      ...rowFromDraft(draft.value),
      source: "admin",
      created_by: user.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, code: draft.value.code });
  } catch (err) {
    console.error("admin promos", err);
    return NextResponse.json({ error: "Could not save the code." }, { status: 500 });
  }
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  return String(value || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function rowFromDraft(value: NormalizedPromoDraft) {
  return {
    code: value.code,
    kind: value.kind,
    percent_off: value.percentOff,
    amount_off_sar: value.amountOffSar,
    free_months: value.freeMonths,
    plans: value.plans,
    intervals: value.intervals,
    cycle_count: value.cycleCount,
    starts_at: value.startsAt,
    expires_at: value.expiresAt,
    max_uses: value.maxUses,
    one_per_user: value.onePerUser,
    audience: value.audience,
    email_domains: value.emailDomains,
    restricted_user_id: value.restrictedUserId,
    note: value.note,
    status: "active",
  };
}

async function createBatch(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  body: Record<string, unknown>
) {
  const count = Math.floor(Number(body.count));
  if (!Number.isFinite(count) || count < 1 || count > 500) {
    return { error: "Generate between 1 and 500 codes.", status: 400 };
  }
  const prefix = String(body.prefix || "STUDENT");
  const domains = stringList(body.emailDomains);
  const draft = validatePromoDraft({
    code: "BATCH-CHECK",
    kind: String(body.kind || "free_months") as PromoKind,
    percentOff: numberOrNull(body.percentOff),
    amountOffSar: numberOrNull(body.amountOffSar),
    freeMonths: numberOrNull(body.freeMonths) ?? 1,
    plans: stringList(body.plans).length ? stringList(body.plans) : ["engineer"],
    intervals: stringList(body.intervals).length ? stringList(body.intervals) : ["month"],
    cycleCount: numberOrNull(body.cycleCount) ?? numberOrNull(body.freeMonths) ?? 1,
    startsAt: riyadhIso(body.startsAt) || new Date().toISOString(),
    expiresAt: riyadhIso(body.expiresAt),
    maxUses: 1,
    onePerUser: true,
    audience: domains.length > 0 ? "email_domain" : "any",
    emailDomains: domains,
    note: String(body.note || "Student batch"),
  });
  if (!draft.ok) return { error: draft.error, status: 400 };
  const batchId = crypto.randomUUID();
  const rows = [];
  const seen = new Set<string>();
  while (rows.length < count) {
    const bytes = crypto.randomBytes(8);
    const code = randomPromoCode(prefix, (index) => bytes[index] ?? 0, 8);
    if (!isPromoCodeShape(code) || seen.has(code)) continue;
    seen.add(code);
    rows.push({
      ...rowFromDraft({ ...draft.value, code }),
      batch_id: batchId,
      source: "batch",
      created_by: userId,
    });
  }
  const { error } = await admin.from("promo_codes").insert(rows);
  if (error) return { error: error.message, status: 500 };
  return { ok: true, batchId, count: rows.length, codes: rows.map((row) => row.code) };
}

async function saveQuestion(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  body: Record<string, unknown>
) {
  const questionEn = String(body.questionEn || "").trim();
  const questionAr = String(body.questionAr || "").trim();
  const rawChoices = Array.isArray(body.choices) ? body.choices : [];
  const choices = rawChoices.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { en?: unknown; ar?: unknown };
    const en = String(row.en || "").trim();
    const ar = String(row.ar || "").trim();
    if (!en || !ar) return [];
    return [{ id: `c${index + 1}`, en, ar }];
  });
  if (!questionEn || !questionAr) return { error: "Write the question in English and Arabic.", status: 400 };
  if (choices.length < 2 || choices.length > 6) return { error: "Add 2 to 6 choices, each in English and Arabic.", status: 400 };
  const correctIndex = Math.floor(Number(body.correctIndex));
  if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
    return { error: "Choose the correct answer.", status: 400 };
  }
  const reward = Math.floor(Number(body.rewardPercent ?? 10));
  if (!Number.isFinite(reward) || reward < 1 || reward > 100) return { error: "Reward percent must be from 1 to 100.", status: 400 };
  const validDays = Math.floor(Number(body.validDays ?? 14));
  if (!Number.isFinite(validDays) || validDays < 1 || validDays > 90) {
    return { error: "Code validity must be from 1 to 90 days.", status: 400 };
  }
  const startsAt = riyadhIso(body.startsAt);
  const endsAt = riyadhIso(body.endsAt);
  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return { error: "Set a start and a later end, in Riyadh time.", status: 400 };
  }
  const plans = stringList(body.plans).filter((plan): plan is SelfServePlanId => isSelfServePlan(plan));
  const intervals = stringList(body.intervals).filter((item): item is BillingInterval => item === "month" || item === "year");
  const { data, error } = await admin
    .from("weekly_questions")
    .insert({
      question_en: questionEn.slice(0, 500),
      question_ar: questionAr.slice(0, 500),
      choices,
      reward_percent: reward,
      participation_only: body.participationOnly === true,
      code_valid_days: validDays,
      plans: plans.length > 0 ? plans : PROMO_PLANS,
      intervals: intervals.length > 0 ? intervals : ["month", "year"],
      cycle_count: 1,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "active",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message || "Could not save the question.", status: 500 };
  const { error: answerErr } = await admin.from("weekly_question_answers").insert({
    question_id: data.id,
    choice_id: choices[correctIndex].id,
  });
  if (answerErr) return { error: answerErr.message, status: 500 };
  return { ok: true, id: data.id };
}
