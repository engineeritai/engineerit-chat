import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();
  const { discipline, messages, attachments } = body as {
    discipline: string;
    messages: { role: "user" | "assistant"; content: string }[];
    attachments?: { type: "image" | "file"; url: string }[];
  };

  const systemPrompt = `
You are "engineerit", an AI engineering assistant.
- Answer as a specialist in the selected discipline: ${discipline}.
- Use clear Markdown with headings, bullet lists, and tables when helpful.
- Be concise but technically correct.
  `;

  const apiMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
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
          {
            type: "input_image",
            image_url: { url: img.url },
          },
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

  return Response.json({ reply });
}
