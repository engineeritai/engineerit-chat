import OpenAI from "openai";
import { toFile } from "openai/uploads";
import type { TakeoffCompletion } from "@/lib/takeoff/pipeline";

const MODELS = [
  process.env.TAKEOFF_MODEL || "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4o-mini",
].filter((model, index, all) => all.indexOf(model) === index);

function client(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function modelMissing(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /model|not found|does not exist|404/i.test(message);
}

/**
 * Vision or PDF transcription for a take-off.
 * The model returns dimensions only. Quantities are computed later in code.
 */
export const completeTakeoffExtraction: TakeoffCompletion = async ({ prompt, image, pdf }) => {
  const openai = client();
  let lastError: unknown;
  for (const model of MODELS) {
    try {
      if (pdf) {
        const uploaded = await openai.files.create({
          file: await toFile(pdf.buffer, pdf.filename),
          purpose: "user_data",
        });
        try {
          const response = await openai.responses.create({
            model,
            temperature: 0,
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: prompt },
                  { type: "input_file", file_id: uploaded.id },
                ],
              },
            ],
          });
          const anyResponse = response as { output_text?: string };
          return anyResponse.output_text || "";
        } finally {
          await openai.files.delete(uploaded.id).catch(() => undefined);
        }
      }
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...(image
                ? [
                    {
                      type: "image_url" as const,
                      image_url: {
                        url: `data:${image.mime};base64,${image.base64}`,
                        detail: "high" as const,
                      },
                    },
                  ]
                : []),
            ],
          },
        ],
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err) {
      lastError = err;
      if (!modelMissing(err)) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Take-off extraction failed.");
};
