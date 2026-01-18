// app/api/export/pptx/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// IMPORTANT: avoid default import issues in Next/TS
const PptxGenJS = require("pptxgenjs");

type ReqBody = {
  title?: string;
  content?: string;
  text?: string; // allow {text} as well
  filename?: string;
};

function isProbablyArabic(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function safeFilename(name: string) {
  return (
    name
      .trim()
      .replace(/[^\w\-(). ]+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "engineerit-ai"
  );
}

function chunkForSlides(text: string, maxCharsPerSlide = 1400) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [""];

  const paras = normalized
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const slides: string[] = [];
  let buf = "";

  for (const p of paras) {
    const candidate = buf ? `${buf}\n\n${p}` : p;
    if (candidate.length <= maxCharsPerSlide) {
      buf = candidate;
    } else {
      if (buf) slides.push(buf);
      if (p.length > maxCharsPerSlide) {
        let i = 0;
        while (i < p.length) {
          slides.push(p.slice(i, i + maxCharsPerSlide));
          i += maxCharsPerSlide;
        }
        buf = "";
      } else {
        buf = p;
      }
    }
  }
  if (buf) slides.push(buf);

  return slides.length ? slides : [normalized];
}

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ReqBody>;

    const content = (body.content ?? body.text ?? "").toString();

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Missing 'content' (or 'text') in request body." },
        { status: 400 }
      );
    }

    const title =
      (body.title || "engineer it").toString().trim() || "engineer it";

    const isRTL = isProbablyArabic(content) || isProbablyArabic(title);

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";

    pptx.author = "engineerit.ai";
    pptx.company = "engineerit.ai";
    pptx.subject = "AI Chat Export";
    pptx.title = title;

    pptx.theme = {
      headFontFace: "Calibri",
      bodyFontFace: "Calibri",
      lang: isRTL ? "ar-SA" : "en-US",
    };

    const W = 13.333;
    const H = 7.5;

    // Title slide
    {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      slide.addText(title, {
        x: 0.9,
        y: 2.3,
        w: W - 1.8,
        h: 1.0,
        fontFace: "Calibri",
        fontSize: 38,
        bold: true,
        color: "111827",
        align: isRTL ? "right" : "left",
        valign: "middle",
      });

      slide.addText(`Exported on ${new Date().toLocaleString()}`, {
        x: 0.9,
        y: 3.5,
        w: W - 1.8,
        h: 0.6,
        fontFace: "Calibri",
        fontSize: 14,
        color: "6B7280",
        align: isRTL ? "right" : "left",
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 0.9,
        y: 4.35,
        w: 4.2,
        h: 0.08,
        fill: { color: "2563EB" },
        line: { color: "2563EB" },
      });

      slide.addText("engineerit.ai", {
        x: 0.9,
        y: 4.5,
        w: W - 1.8,
        h: 0.4,
        fontFace: "Calibri",
        fontSize: 12,
        color: "2563EB",
        align: isRTL ? "right" : "left",
      });
    }

    // Content slides
    const chunks = chunkForSlides(content, 1400);

    chunks.forEach((chunk, idx) => {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: W,
        h: 0.55,
        fill: { color: "F3F4F6" },
        line: { color: "F3F4F6" },
      });

      slide.addText(title, {
        x: 0.7,
        y: 0.12,
        w: W - 1.4,
        h: 0.35,
        fontFace: "Calibri",
        fontSize: 14,
        bold: true,
        color: "111827",
        align: isRTL ? "right" : "left",
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.7,
        y: 0.9,
        w: W - 1.4,
        h: H - 1.7,
        fill: { color: "FFFFFF" },
        line: { color: "E5E7EB" },
        radius: 10,
      });

      slide.addText(chunk, {
        x: 1.0,
        y: 1.1,
        w: W - 2.0,
        h: H - 2.1,
        fontFace: "Calibri",
        fontSize: 18,
        color: "111827",
        align: isRTL ? "right" : "left",
        valign: "top",
        lineSpacingMultiple: 1.1,
      });

      slide.addText(`${idx + 1}/${chunks.length}`, {
        x: 0.7,
        y: H - 0.55,
        w: W - 1.4,
        h: 0.3,
        fontFace: "Calibri",
        fontSize: 11,
        color: "6B7280",
        align: "right",
      });
    });

    // Use nodebuffer (most reliable in Next)
    const buf: Buffer = await pptx.write("nodebuffer");

    const requested = body.filename
      ? safeFilename(body.filename)
      : `engineerit-ai-${nowStamp()}`;

    const outName = requested.toLowerCase().endsWith(".pptx")
      ? requested
      : `${requested}.pptx`;

    // ✅ Vercel/NextResponse type-safe (DON'T return Buffer directly)
    const bytes = new Uint8Array(buf);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${outName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("PPTX export error:", err);
    return NextResponse.json(
      { error: "Failed to generate PPTX.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
