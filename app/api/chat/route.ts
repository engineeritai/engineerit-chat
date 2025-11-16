import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Role = "user" | "assistant";

type Message = {
  id?: string;
  role: Role;
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      discipline: string;
      messages: Message[];
    };

    const { discipline, messages } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not set on the server. Please configure it in .env.local.",
        },
        { status: 500 }
      );
    }

    // Build chat history for OpenAI
    const chatMessages = [
      {
        role: "system" as const,
        content: `
You are EngineerAI, an engineering assistant for the website engineerit.ai.

- Always answer as a helpful **engineering expert**.
- Discipline: ${discipline || "General"}.
- Use **clear markdown**: headings, bullet points, numbered lists where helpful.
- Show formulas in markdown when relevant.
- If the user uploads drawings/files (mentioned in text), describe how you would interpret them.
- Never claim to be legally or professionally liable; user is responsible for decisions.
      `.trim(),
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: chatMessages,
      temperature: 0.4,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "I could not generate a reply.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("API /api/chat error:", err);
    return NextResponse.json(
      {
        error: "Internal error in /api/chat",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
