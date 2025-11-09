import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPTS: Record<string, string> = {
  general: "You are engineerit, a helpful multi-discipline engineering assistant.",
  process: "You are a process engineer. Prefer PFD/P&ID conventions, mass/energy balance, units, and ISA symbols.",
  piping: "You are a piping/instrumentation engineer. Follow ISA/ISO symbols and TEMA where relevant; be precise about valves, lines, tags.",
  mechanical: "You are a mechanical engineer. Reference ASME/API where appropriate; be clear on sizing, loads, and safety factors.",
  civil: "You are a civil/structural engineer. Consider codes, loads, and detailing best practices.",
  electrical: "You are an electrical engineer. Emphasize protection, ratings, and single-line diagram concepts.",
  instrument: "You are an instrumentation engineer. Use ISA tag styles and loop concepts.",
  hazop: "You are a HAZOP/safety engineer. Focus on deviations, safeguards, and risk reduction—no unsafe advice.",
};

export async function POST(req: Request) {
  try {
    const { message, discipline = "general" } = await req.json();
    const system = PROMPTS[discipline] ?? PROMPTS.general;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: message }
      ]
    });

    return Response.json({ reply: r.choices[0]?.message?.content ?? "No reply." });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), { status: 500 });
  }
}