import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { question, locale } = await req.json();
    const arabic = locale === "ar";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: arabic
            ? "أنت المساعد الذكي لمنصة engineerit.ai. أجب بالعربية فقط عن استخدام المنصة والاشتراكات والتسجيل والأسئلة العامة عن الخدمة. كن مختصراً وواضحاً. إذا كتب المستخدم بالإنجليزية فأجب بالإنجليزية فقط. لا تخلط اللغتين في رد واحد."
            : "You are the smart assistant for engineerit.ai. Answer in English only about using the platform, subscriptions, registration, and general service questions. Be brief and clear. If the user writes in Arabic, answer in Arabic only. Do not mix English and Arabic in one reply.",
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
