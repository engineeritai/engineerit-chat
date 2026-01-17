import OpenAI from "openai";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const { discipline, messages, attachments, planId, userId } = body as {
    discipline: string;
    messages: { role: "user" | "assistant"; content: string }[];
    attachments?: { type: "image" | "file"; url: string }[];
    planId?: string;
    userId?: string | null;
  };

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
          limit.plan === "guest"
            ? "Daily limit reached (1 reply/day). Please register or log in."
            : "Daily limit reached for Assistant plan (3 replies/day). Please upgrade.",
        plan: limit.plan,
      },
      { status: 429 }
    );
  }

  const systemPrompt = `
You are "engineer it", an AI engineering assistant.
- Answer as an expert subject matter in the selected discipline: ${discipline} with professional mechanism and relevant engineering standards such as ASME, IEEE, ISO, API, NEBOSH, NFPA, ASTM, IEC, ACI, AISC, OSHA, and others recognized international standard related to discipline or topic.
- Use clear Markdown with headings, bullet lists, and professional designed tables when helpful.
- Be concise with latest updates, answers and solutions; but technically strong and correct.
- Include as possible any engineering references and diagrams for specific topics such as pumps, compressors, turbines, heat exchangers, vessels, columns, building structures, roads, bridges, furnaces, heaters, tanks, electrical transformers, electrical substations, instrumentation loops, layouts, 2D autocads and others supporting the topics.
- Act in specific engineering topics or discipline: ${discipline} as Engineering Consultant and expert subject matter.
- Specify the Material Types and related standards applicable for required processes or environment.
- Be Specific with rich references of engineering standards in all desciplines. 
- Give General Feedback for non registered or non logged in users, limited feedback to assistant plan, and act as professional and expert subject matter for subscribered plans of engineer, professional and consultant
  `;

  const apiMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({ role: m.role, content: m.content })),
  ];

  // If the last user message has an image attachment, make it multimodal
  if (attachments && attachments.length > 0) {
    const img = attachments.find((a) => a.type === "image");
    if (img) {
      const lastIndex = apiMessages.length - 1;
      const last = apiMessages[lastIndex];

      apiMessages[lastIndex] = {
        role: last.role,
        content: [
          { type: "text", text: last.content },
          { type: "input_image", image_url: { url: img.url } },
        ],
      };
    }
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: apiMessages,
  });

  const reply =
    completion.choices[0]?.message?.content ||
    "I couldn't generate a response this time.";

  return NextResponse.json({ reply });
}
