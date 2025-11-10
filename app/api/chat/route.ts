// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { messages, discipline } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse(
        "Missing OPENAI_API_KEY in environment.",
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build a classic ChatML prompt from your local messages array.
    // Each item should have role: "user" | "assistant" and content: string.
    const chatMessages =
      (messages || []).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    // Add a system instruction to steer answers by discipline
    chatMessages.unshift({
      role: "system",
      content: `You are EngineerAI, a helpful engineering assistant. If a discipline is given, answer with that domain in mind. Discipline: ${discipline}. Use clear structure, bullets, and concise explanations.`,
    });

    // Use a lightweight, fast model (you can change to gpt-4o if you have access)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.2,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error(err);
    return new NextResponse(
      err?.message || "Server error generating response.",
      { status: 500 }
    );
  }
}
