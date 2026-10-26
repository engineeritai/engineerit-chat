import { calculateTakeoff, workingsMatchQuantities } from "@/lib/takeoff/calculate";
import { readingFromModelJson, TAKEOFF_EXTRACTION_PROMPT } from "@/lib/takeoff/modelReading";
import { ocrImage } from "@/lib/takeoff/ocr";
import { extractPdfText } from "@/lib/takeoff/pdfText";
import { parseDrawingText } from "@/lib/takeoff/parseText";
import { extractJsonObject } from "@/lib/takeoff/json";
import { renderTakeoff } from "@/lib/takeoff/render";
import type { Confidence, ReadSource, TakeoffResult } from "@/lib/takeoff/types";
import { emptyReading } from "@/lib/takeoff/types";
import type { UiLocale } from "@/lib/replyLanguage";

export type TakeoffCompletion = (args: {
  prompt: string;
  image?: { mime: string; base64: string };
  pdf?: { filename: string; buffer: Buffer };
}) => Promise<string>;

function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

function isImage(filename: string): boolean {
  return /\.(png|jpe?g|webp|gif|tiff?|bmp)$/i.test(filename);
}

export async function readDrawingText(filename: string, buffer: Buffer): Promise<{ text: string; source: ReadSource }> {
  if (isPdf(filename)) {
    try {
      const text = await extractPdfText(buffer);
      return { text, source: "pdf-text" };
    } catch (err) {
      console.error("takeoff pdf text failed", err);
      return { text: "", source: "pdf-text" };
    }
  }
  if (isImage(filename)) {
    const text = await ocrImage(buffer);
    return { text, source: "ocr" };
  }
  return { text: "", source: "none" };
}

function mimeFor(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "image/png";
}

/**
 * Read the drawing, then measure it in code.
 * A text layer or a confident OCR reading is used as-is.
 * Otherwise the model may transcribe dimensions, and the same calculator runs.
 */
export async function prepareTakeoff(args: {
  filename: string;
  buffer: Buffer;
  locale: UiLocale;
  complete?: TakeoffCompletion;
}): Promise<TakeoffResult> {
  const read = await readDrawingText(args.filename, args.buffer);
  let parsed = parseDrawingText(read.text);
  let source: ReadSource = parsed.confidence === "none" ? "none" : read.source;
  let confidence: Confidence = parsed.confidence;

  if (confidence !== "high" && args.complete && (isPdf(args.filename) || isImage(args.filename))) {
    try {
      const image = isImage(args.filename)
        ? { mime: mimeFor(args.filename), base64: args.buffer.toString("base64") }
        : undefined;
      const pdf = isPdf(args.filename) ? { filename: args.filename, buffer: args.buffer } : undefined;
      const raw = await args.complete({ prompt: TAKEOFF_EXTRACTION_PROMPT, image, pdf });
      const model = readingFromModelJson(extractJsonObject(raw));
      if (model.confidence === "high" || (model.confidence === "partial" && confidence !== "partial")) {
        parsed = model;
        source = "model";
        confidence = model.confidence;
      } else if (confidence === "none" && model.confidence !== "none") {
        parsed = model;
        source = "model";
        confidence = model.confidence;
      }
    } catch (err) {
      console.error("takeoff model extract failed", err);
    }
  }

  const reading = parsed.reading || emptyReading();
  const lines = calculateTakeoff(reading);
  if (lines.length > 0 && !workingsMatchQuantities(lines)) {
    throw new Error("Take-off consistency check failed: a quantity did not match its working.");
  }
  const reply = renderTakeoff(args.locale, reading, lines, lines.length ? source : "none");
  return { source: lines.length ? source : "none", confidence, reading, lines, reply };
}
