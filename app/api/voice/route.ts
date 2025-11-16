import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response("No audio file uploaded", { status: 400 });
    }

    // IMPORTANT: use a supported transcription model
    const result = await client.audio.transcriptions.create({
      model: "whisper-1", // stable speech-to-text model
      file,
    });

    return Response.json({ text: result.text ?? "" });
  } catch (err: any) {
    console.error("Voice route error:", err);

    // Try to surface OpenAI error message if available
    const message =
      err?.error?.message ||
      err?.message ||
      "Transcription failed on the server.";

    return new Response(message, { status: 500 });
  }
}
