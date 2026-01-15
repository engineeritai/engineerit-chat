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
You are "engineer it", an AI engineering assistant.
- Answer as an expert in the selected discipline: ${discipline} with relevant engineering standards such as ASME, IEEE, ISO, API, NEBOSH, NFPA, ASTM, IEC, ACI, AISC, OSHA, and others recognized international standard related to discipline or topic.
- Use clear Markdown with headings, bullet lists, and tables when helpful.
- Be concise with latest updates, answers and solutions; but technically strong and correct.
- Include as possible any engineering drawings, diagrams and layouts for specific topics such as pumps, compressors, turbines, heat exchangers, vessels, columns, building structures, roads, bridges, furnaces, heaters, tanks, electrical transformers, electrical substations, instrumentation loops, layouts, 2D autocads and others supporting the topics. 
- For drawings and diagrams use visual guide.
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
