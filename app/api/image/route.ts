import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { gateAdvisor } from "@/lib/advisorGate";
import { assertFileAnalysisAccess } from "@/lib/fileAnalysisAccess";
import {
  IncomingFileError,
  filenameFromStoragePath,
  readIncomingFile,
  removeIncomingFile,
} from "@/lib/incomingStorage";
import { MAX_UPLOAD_BYTES, fileTooLargeMessage, messageLocale } from "@/lib/uploadLimits";
import { replyLanguage, replyLanguageRule, type UiLocale } from "@/lib/replyLanguage";
import { isTakeoffRequest } from "@/lib/takeoff/detect";
import { completeTakeoffExtraction } from "@/lib/takeoff/openaiExtract";
import { prepareTakeoff } from "@/lib/takeoff/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const IMAGE_MIME = /^image\/(png|jpeg|jpg|webp|gif|bmp|tiff)$/i;

function imageMime(filename: string, contentType?: string): string {
  if (contentType && IMAGE_MIME.test(contentType)) return contentType.toLowerCase();
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  if (ext === "tif" || ext === "tiff") return "image/tiff";
  return "image/png";
}

function imageQuestion(locale: UiLocale, given?: string): string {
  if (given && given.trim()) return given;
  return locale === "ar"
    ? "صف هذه الصورة الهندسية بالتفصيل واستخرج المعلومات الفنية المفيدة."
    : "Describe this engineering image in detail and extract useful technical information.";
}

async function analyzeImageBuffer(
  buffer: Buffer,
  mime: string,
  question: string,
  advisorSystem: string | undefined,
  locale: UiLocale,
  filename = "drawing.png"
): Promise<string> {
  if (isTakeoffRequest(question)) {
    const result = await prepareTakeoff({
      filename,
      buffer,
      locale: replyLanguage(locale, question),
      complete: completeTakeoffExtraction,
    });
    return result.reply;
  }
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      ...(advisorSystem ? [{ role: "system" as const, content: advisorSystem }] : []),
      {
        role: "user",
        content: [
          {
            type: "text",
            text: advisorSystem
              ? `${question}\n\nFollow the output template in the system message. Use only what is visible in the image. ${replyLanguageRule(locale)}`
              : `${question}\n\n${replyLanguageRule(locale)}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${buffer.toString("base64")}` },
          },
        ],
      },
    ],
  });
  return completion.choices[0]?.message?.content || "";
}

async function openAdvisor(req: Request, advisorId: unknown, locale: unknown, playbookId: unknown) {
  const advisorGate = await gateAdvisor({ request: req, advisorId, locale, playbookId });
  if (advisorGate.active && !advisorGate.ok) return { response: advisorGate.response };
  return {
    advisorSystem: advisorGate.active && advisorGate.ok ? advisorGate.prompt : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await handleStoredImage(req);
    }
    return await handleFormImage(req);
  } catch (err: unknown) {
    console.error("Image API error:", err);
    const message =
      (err as { error?: { message?: string }; message?: string })?.error?.message ||
      (err as { message?: string })?.message ||
      "Image analysis failed on the server.";
    return new Response(message, { status: 500 });
  }
}

async function handleStoredImage(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    storagePath?: unknown;
    filename?: unknown;
    contentType?: unknown;
    question?: unknown;
    advisorId?: unknown;
    locale?: unknown;
    playbookId?: unknown;
  } | null;

  const storagePath = typeof body?.storagePath === "string" ? body.storagePath : "";
  const locale = messageLocale(body?.locale ?? req.cookies.get("engineerit_locale")?.value);
  const question = imageQuestion(
    locale,
    typeof body?.question === "string" ? body.question : undefined
  );

  const opened = await openAdvisor(req, body?.advisorId, body?.locale, body?.playbookId);
  if ("response" in opened) {
    await removeIncomingFile(storagePath);
    return opened.response;
  }
  const access = await assertFileAnalysisAccess(req, locale);
  if (!access.ok) {
    await removeIncomingFile(storagePath);
    return access.response;
  }

  let buffer: Buffer;
  try {
    buffer = await readIncomingFile(storagePath, locale);
  } catch (err) {
    await removeIncomingFile(storagePath);
    if (err instanceof IncomingFileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const filename = filenameFromStoragePath(storagePath);
    const mime = imageMime(
      filename,
      typeof body?.contentType === "string" ? body.contentType : undefined
    );
    const reply = await analyzeImageBuffer(
      buffer,
      mime,
      question,
      opened.advisorSystem,
      locale,
      filename
    );
    return Response.json({ reply });
  } finally {
    await removeIncomingFile(storagePath);
  }
}

async function handleFormImage(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const advisorField = formData.get("advisorId");
  const localeField = formData.get("locale");
  const playbookField = formData.get("playbookId");
  const locale = messageLocale(
    typeof localeField === "string" ? localeField : req.cookies.get("engineerit_locale")?.value
  );
  const questionField = formData.get("question");
  const question = imageQuestion(locale, typeof questionField === "string" ? questionField : undefined);

  const opened = await openAdvisor(req, advisorField, localeField, playbookField);
  if ("response" in opened) return opened.response;
  const access = await assertFileAnalysisAccess(req, locale);
  if (!access.ok) return access.response;

  if (!(file instanceof File)) {
    return new Response(locale === "ar" ? "لم ترفع صورة" : "No image uploaded", { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: fileTooLargeMessage(locale) }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const reply = await analyzeImageBuffer(
    buffer,
    imageMime(file.name, file.type),
    question,
    opened.advisorSystem,
    locale,
    file.name || "drawing.png"
  );
  return Response.json({ reply });
}
