// app/api/export/pptx/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ IMPORTANT: avoid default import issues in Next/TS
const PptxGenJS = require("pptxgenjs");

type ReqBody = {
  title?: string;
  content?: string;
  text?: string;
  filename?: string;
};

function isProbablyArabic(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text || "");
}

function safeFilename(name: string) {
  return (
    (name || "")
      .trim()
      .replace(/[^\w\-(). ]+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "engineerit-ai"
  );
}

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

type Section = { heading: string; body: string };

function normalizeText(s: string) {
  return (s || "").replace(/\r\n/g, "\n").trim();
}

/**
 * Smart sectioning:
 * - Splits on Markdown headings (#, ##, ###)
 * - Also splits on "Title:" style lines (ending with :)
 */
function splitIntoSections(raw: string): Section[] {
  const text = normalizeText(raw);
  if (!text) return [{ heading: "Content", body: "" }];

  const lines = text.split("\n");
  const sections: Section[] = [];

  let curHeading = "";
  let curBody: string[] = [];

  const flush = () => {
    const body = curBody.join("\n").trim();
    if (!curHeading && !body) return;
    sections.push({
      heading: curHeading || "Content",
      body,
    });
    curHeading = "";
    curBody = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || "").trimEnd();

    // Markdown heading
    const m = line.match(/^(#{1,3})\s+(.*)$/);
    if (m) {
      flush();
      curHeading = (m[2] || "").trim() || "Section";
      continue;
    }

    // "Something:" title line (heuristic)
    const looksLikeTitle =
      line.length >= 4 &&
      line.length <= 80 &&
      /:$/.test(line) &&
      !/^\s*[-*]\s+/.test(line);

    if (looksLikeTitle) {
      flush();
      curHeading = line.replace(/:$/, "").trim() || "Section";
      continue;
    }

    curBody.push(lines[i]);
  }

  flush();

  // If we ended up with one section but no clear heading
  if (sections.length === 1 && sections[0].heading === "Content") return sections;

  // Remove empty bodies (keep heading-only sections as small body)
  return sections.map((s) => ({
    heading: s.heading || "Section",
    body: s.body || "",
  }));
}

/**
 * Break long text into slide-sized chunks (keeps paragraphs)
 */
function chunkText(text: string, maxChars = 1400) {
  const normalized = normalizeText(text);
  if (!normalized) return [""];

  const paras = normalized
    .split("\n")
    .map((p) => p.trimEnd())
    .filter((p) => p.trim().length > 0);

  const chunks: string[] = [];
  let buf = "";

  for (const p of paras) {
    const candidate = buf ? `${buf}\n\n${p}` : p;
    if (candidate.length <= maxChars) {
      buf = candidate;
    } else {
      if (buf) chunks.push(buf);
      if (p.length > maxChars) {
        let i = 0;
        while (i < p.length) {
          chunks.push(p.slice(i, i + maxChars));
          i += maxChars;
        }
        buf = "";
      } else {
        buf = p;
      }
    }
  }
  if (buf) chunks.push(buf);

  return chunks.length ? chunks : [normalized];
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

    const title = (body.title || "engineer it").toString().trim() || "engineer it";
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

    // ---------- Title slide ----------
    {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      slide.addText(title, {
        x: 0.9,
        y: 2.25,
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
        y: 3.45,
        w: W - 1.8,
        h: 0.6,
        fontFace: "Calibri",
        fontSize: 14,
        color: "6B7280",
        align: isRTL ? "right" : "left",
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 0.9,
        y: 4.3,
        w: 4.2,
        h: 0.08,
        fill: { color: "2563EB" },
        line: { color: "2563EB" },
      });

      slide.addText("engineerit.ai", {
        x: 0.9,
        y: 4.45,
        w: W - 1.8,
        h: 0.4,
        fontFace: "Calibri",
        fontSize: 12,
        color: "2563EB",
        align: isRTL ? "right" : "left",
      });
    }

    // ---------- Content slides (section-based) ----------
    const sections = splitIntoSections(content);

    // Pre-calc total slides for page numbering
    const sectionChunks = sections.map((s) => ({
      heading: s.heading,
      chunks: chunkText(s.body || "", 1300),
    }));
    const totalSlides = sectionChunks.reduce((acc, x) => acc + x.chunks.length, 0);

    let slideNo = 0;

    for (const sec of sectionChunks) {
      for (let i = 0; i < sec.chunks.length; i++) {
        slideNo++;

        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };

        // top bar
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: W,
          h: 0.65,
          fill: { color: "F3F4F6" },
          line: { color: "F3F4F6" },
        });

        // section heading
        slide.addText(sec.heading || title, {
          x: 0.75,
          y: 0.18,
          w: W - 1.5,
          h: 0.35,
          fontFace: "Calibri",
          fontSize: 16,
          bold: true,
          color: "111827",
          align: isRTL ? "right" : "left",
        });

        // content card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.75,
          y: 0.95,
          w: W - 1.5,
          h: H - 1.65,
          fill: { color: "FFFFFF" },
          line: { color: "E5E7EB" },
          radius: 10,
        });

        slide.addText(sec.chunks[i] || "", {
          x: 1.05,
          y: 1.15,
          w: W - 2.1,
          h: H - 2.15,
          fontFace: "Calibri",
          fontSize: 18,
          color: "111827",
          align: isRTL ? "right" : "left",
          valign: "top",
          lineSpacingMultiple: 1.12,
        });

        // footer page
        slide.addText(`${slideNo}/${totalSlides}`, {
          x: 0.75,
          y: H - 0.55,
          w: W - 1.5,
          h: 0.3,
          fontFace: "Calibri",
          fontSize: 11,
          color: "6B7280",
          align: "right",
        });
      }
    }

    // ✅ Generate Buffer then convert to Uint8Array for NextResponse BodyInit typing
    const buf: Buffer = await pptx.write("nodebuffer");
    const bodyBytes = new Uint8Array(buf);

    const requested = body.filename
      ? safeFilename(body.filename)
      : `engineerit-ai-${nowStamp()}`;

    const outName = requested.toLowerCase().endsWith(".pptx")
      ? requested
      : `${requested}.pptx`;

    return new NextResponse(bodyBytes, {
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
