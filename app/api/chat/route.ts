import OpenAI from "openai";

export const runtime = "nodejs";      // use Node on Vercel (not edge)
export const dynamic = "force-dynamic"; // avoid caching

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Engineerit, an engineering assistant." },
        { role: "user", content: message }
      ]
    });
    return Response.json({ reply: r.choices[0]?.message?.content ?? "No reply." });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), { status: 500 });
  }
}