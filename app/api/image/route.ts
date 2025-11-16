import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const question =
      (formData.get("question") as string) ||
      "Describe this engineering image in detail and extract useful technical information.";

    if (!(file instanceof File)) {
      return new Response("No image uploaded", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mime = file.type || "image/png";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: question },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${base64}`,
              },
            },
          ],
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content || "";

    return Response.json({ reply });
  } catch (err: any) {
    console.error("Image API error:", err);
    const msg =
      err?.error?.message ||
      err?.message ||
      "Image analysis failed on the server.";
    return new Response(msg, { status: 500 });
  }
}
