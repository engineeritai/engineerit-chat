import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "edge"; // serverless runtime for faster responses

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 500 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Engineerit — an AI assistant for engineers (civil, mechanical, electrical, process, geotechnical). Give clear, concise, and professional answers."
        },
        { role: "user", content: message }
      ],
    });

    return Response.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }