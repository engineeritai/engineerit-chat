import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "أنت المساعد الذكي لمنصة هندسها | engineerit.ai. ساعد المستخدم باللغة العربية أو الإنجليزية في استخدام المنصة، الاشتراكات، التسجيل، وأي أسئلة عامة عن الخدمة. كن مختصرًا وواضحًا.",
        },
        {
          role: "user",
          content: question || "",
        },
      ],
      stream: false,
    });

    const answer = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error(err);
    return new NextResponse("Error", { status: 500 });
  }
}
