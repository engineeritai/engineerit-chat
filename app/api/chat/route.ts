import OpenAI from "openai";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { gateAdvisor } from "@/lib/advisorGate";
import { assistantRules } from "@/lib/assistantRules";
import {
  diagramRetryNeeded,
  ensureReplyCharts,
  hasRenderableFlow,
  hasRenderableGantt,
  hasRenderableScurve,
  mermaidFence,
  requestedCharts,
  sanitizeFlowchart,
} from "@/lib/diagramReply";
import { appendSources, sourcesFromResponse, type SearchResponse } from "@/lib/citations";
import { replyLanguageRule, uiLocale } from "@/lib/replyLanguage";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Server-side admin client (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getIp(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  return real || "0.0.0.0";
}

function hashIp(ip: string) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function todayUTCDate() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function enforceDailyLimit(args: {
  ip: string;
  userId: string | null;
  planId: string; // guest | assistant | engineer | professional | consultant
}) {
  const { ip, userId, planId } = args;

  const plan = planId || (userId ? "assistant" : "guest");

  const max =
    plan === "guest" ? 1 : plan === "assistant" ? 3 : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(max)) return { ok: true as const };

  // NOTE: You MUST create the table in Supabase:
  // public.daily_usage_limits(day date, ip_hash text, user_key text, plan text, count int)

  const day = todayUTCDate();
  const ip_hash = hashIp(ip);
  const user_key = userId || "guest";

  // read current
  const { data: existing, error: readErr } = await supabaseAdmin
    .from("daily_usage_limits")
    .select("count")
    .eq("day", day)
    .eq("ip_hash", ip_hash)
    .eq("user_key", user_key)
    .eq("plan", plan)
    .maybeSingle();

  if (readErr) {
    // fail-open to avoid blocking if DB issue
    return { ok: true as const };
  }

  const cur = existing?.count ?? 0;
  if (cur >= max) {
    return { ok: false as const, max, cur, plan };
  }

  // upsert
  const { error: upErr } = await supabaseAdmin
    .from("daily_usage_limits")
    .upsert(
      {
        day,
        ip_hash,
        user_key,
        plan,
        count: cur + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "day,ip_hash,user_key,plan" }
    );

  if (upErr) {
    return { ok: true as const };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { discipline, messages, attachments, planId, userId, advisorId, locale: rawLocale, playbookId } = body as {
    discipline: string;
    messages: { role: "user" | "assistant"; content: string }[];
    attachments?: { type: "image" | "file"; url: string }[];
    planId?: string;
    userId?: string | null;
    advisorId?: string;
    locale?: string;
    playbookId?: string;
  };

  const locale = uiLocale(rawLocale);
  const advisorGate = await gateAdvisor({ request: req, advisorId, locale, playbookId });
  if (advisorGate.active && !advisorGate.ok) return advisorGate.response;

  // Enforce daily limit per IP
  const ip = getIp(req);
  const limit = await enforceDailyLimit({
    ip,
    userId: userId ?? null,
    planId: planId || (userId ? "assistant" : "guest"),
  });

  if (!limit.ok) {
    return NextResponse.json(
      {
        error:
          locale === "ar"
            ? limit.plan === "guest"
              ? "بلغت الحد اليومي (رد واحد في اليوم). سجّل أو ادخل."
              : "بلغت الحد اليومي لباقة المساعد (3 ردود في اليوم). يرجى الترقية."
            : limit.plan === "guest"
              ? "Daily limit reached (1 reply/day). Please register or log in."
              : "Daily limit reached for the Assistant plan (3 replies/day). Please upgrade.",
        plan: limit.plan,
      },
      { status: 429 }
    );
  }

  const baseSystemPrompt = [
    `You are "engineer it", an AI engineering assistant.`,
    replyLanguageRule(locale),
    `Answer as an expert in the selected discipline: ${discipline}. Use the relevant engineering standards, including ASME, IEEE, ISO, API, NEBOSH, NFPA, ASTM, IEC, ACI, AISC, the International Building Code, OSHA, and the Saudi Building Code, SASO, Saudi Aramco standards, Saudi Electricity regulations, and SABIC specifications when they apply.`,
    `Be concise, technically correct, and specific about materials and standards. Subscribed engineer, professional, consultant, team, and enterprise plans receive a full expert answer. Guests and the assistant plan receive a shorter answer.`,
    `Reply in the language of the user's latest message. If that message is Arabic, the whole answer is Arabic. Otherwise the whole answer is English. Do not mix Arabic and English in one answer.`,
    assistantRules({ locale }),
  ].join("\n\n");

  const systemPrompt = advisorGate.active && advisorGate.ok ? advisorGate.prompt : baseSystemPrompt;
  const image = attachments?.find((item) => item.type === "image");
  const input = messages.map((message, index) => {
    const isLast = index === messages.length - 1;
    if (isLast && message.role === "user" && image?.url) {
      return {
        role: message.role,
        content: [
          { type: "input_text" as const, text: message.content },
          { type: "input_image" as const, image_url: image.url, detail: "auto" as const },
        ],
      };
    }
    return { role: message.role, content: message.content };
  });

  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt,
      input,
      tools: [
        {
          type: "web_search",
          search_context_size: "low",
          user_location: { type: "approximate", country: "SA", city: "Riyadh", timezone: "Asia/Riyadh" },
        },
      ],
    });
    const parsed = sourcesFromResponse(response as SearchResponse);
    const reply = await finishDiagramReply(
      appendSources(parsed.text, parsed.sources, locale) ||
        (locale === "ar" ? "تعذر إنشاء رد هذه المرة." : "I couldn't generate a response this time."),
      messages,
      systemPrompt,
      locale
    );
    return NextResponse.json({ reply, sources: parsed.sources });
  } catch (err) {
    console.error("web search response failed", err);
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages.map((message) => ({ role: message.role, content: message.content }))],
    });
    const reply = await finishDiagramReply(
      completion.choices[0]?.message?.content ||
        (locale === "ar" ? "تعذر إنشاء رد هذه المرة." : "I couldn't generate a response this time."),
      messages,
      systemPrompt,
      locale
    );
    return NextResponse.json({ reply, sources: [] });
  }
}

async function finishDiagramReply(
  reply: string,
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
  locale: "en" | "ar"
) {
  const userText = [...messages].reverse().find((message) => message.role === "user")?.content || "";
  const prior = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content)
    .join("\n\n");
  const ask = requestedCharts(userText);
  let next = reply;
  const wrongGantt = ask.gantt && !hasRenderableGantt(next);
  const wrongCurve = ask.scurve && !ask.flowchart && !hasRenderableScurve(next);
  const wrongFlow = !ask.gantt && diagramRetryNeeded(next, userText);
  if (wrongGantt || wrongCurve || wrongFlow) {
    const instruction = wrongGantt
      ? locale === "ar"
        ? "استبدل أي مخطط انسيابي بمخطط جانت mermaid واحد فيه مهام ومدد واعتماد after ومحور تاريخ وخط today. لا تُخرج flowchart."
        : "Replace any flowchart with one mermaid gantt. Include tasks, durations, after dependencies, dateFormat YYYY-MM-DD, and a today line. Do not output a flowchart."
      : wrongCurve
        ? locale === "ar"
          ? "أضف سياج scurve الآن. لا تُخرج flowchart."
          : "Include a fenced scurve block now. Do not output a flowchart."
        : locale === "ar"
          ? "أضف الآن مخطط mermaid بسياج flowchart RL مبنيًا من الجواب السابق. لا تكتفِ بوصف المخطط."
          : "Include the fenced mermaid flowchart LR now, built from the previous answer. Do not only describe the diagram.";
    try {
      const retry = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\n${instruction}`,
          },
          ...messages.map((message) => ({ role: message.role, content: message.content })),
          { role: "assistant", content: next },
          { role: "user", content: instruction },
        ],
      });
      const retried = retry.choices[0]?.message?.content || "";
      if (wrongGantt && hasRenderableGantt(retried)) next = retried;
      else if (wrongCurve && hasRenderableScurve(retried)) next = retried;
      else if (wrongFlow) {
        const fence = mermaidFence(retried);
        const clean = fence ? sanitizeFlowchart(fence.source) : null;
        if (clean && !hasRenderableFlow(next)) next = `${next.trim()}\n\n\`\`\`mermaid\n${clean}\n\`\`\`\n`;
      }
    } catch (err) {
      console.error("diagram retry failed", err);
    }
  }
  return ensureReplyCharts(next, userText, prior);
}
