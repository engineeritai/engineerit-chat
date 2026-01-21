// app/api/export/pptx/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PptxGenJS = require("pptxgenjs");

type ReqBody = {
  title?: string;
  content?: string;
  text?: string;
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

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

type Section = { heading: string; lines: string[] };

function splitIntoSections(text: string): Section[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const sections: Section[] = [];
  let current: Section = { heading: "Overview", lines: [] };

  const push = () => {
    const clean = current.lines.map((l) => l.trimEnd());
    const hasBody = clean.join("\n").trim().length > 0;
    if (hasBody) sections.push({ heading: current.heading, lines: clean });
    current = { heading: "Overview", lines: [] };
  };

  for (const raw of lines) {
    const ln = raw.replace(/\t/g, "    ");

    const h = ln.match(/^\s{0,3}(#{1,6})\s+(.+)\s*$/);
    if (h) {
      // new section
      push();
      current.heading = h[2].trim();
      current.lines = [];
      continue;
    }

    current.lines.push(ln);
  }

  // final push
  const tail = current.lines.join("\n").trim();
  if (tail) sections.push({ heading: current.heading, lines: current.lines });

  if (sections.length === 0) return [{ heading: "Overview", lines: text.split("\n") }];
  return sections;
}

function toBullets(sectionLines: string[]) {
  // Convert to bullet-like text:
  // - bullets remain bullets
  // - numbered lines become bullets
  // - other lines kept but short
  const out: string[] = [];
  for (const raw of sectionLines) {
    const ln = raw.trim();
    if (!ln) continue;

    if (/^[-*•]\s+/.test(ln)) out.push("• " + ln.replace(/^[-*•]\s+/, "").trim());
    else if (/^\d+[\).\]]\s+/.test(ln))
      out.push("• " + ln.replace(/^\d+[\).\]]\s+/, "").trim());
    else if (/^>/.test(ln)) out.push("• " + ln.replace(/^>\s*/, "").trim());
    else out.push(ln);
  }
  return out;
}

function chunkLines(lines: string[], maxChars = 900) {
  const chunks: string[] = [];
  let buf = "";

  for (const ln of lines) {
    const candidate = buf ? buf + "\n" + ln : ln;
    if (candidate.length <= maxChars) {
      buf = candidate;
    } else {
      if (buf) chunks.push(buf);
      if (ln.length > maxChars) {
        // hard split very long line
        let i = 0;
        while (i < ln.length) {
          chunks.push(ln.slice(i, i + maxChars));
          i += maxChars;
        }
        buf = "";
      } else {
        buf = ln;
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks.length ? chunks : [""];
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
        y: 2.2,
        w: W - 1.8,
        h: 1.0,
        fontFace: "Calibri",
        fontSize: 40,
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

    const sections = splitIntoSections(content);

    for (const sec of sections) {
      const bullets = toBullets(sec.lines);

      // if no bullets, still include raw
      const lines = bullets.length ? bullets : sec.lines;

      // chunk per slide (keeps slide per section; if long section => extra slides with same heading + "(cont.)")
      const chunks = chunkLines(lines, 950);

      chunks.forEach((chunk, idx) => {
        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };

        // header bar
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: W,
          h: 0.62,
          fill: { color: "F3F4F6" },
          line: { color: "F3F4F6" },
        });

        const heading = idx === 0 ? sec.heading : `${sec.heading} (cont.)`;

        slide.addText(heading, {
          x: 0.7,
          y: 0.14,
          w: W - 1.4,
          h: 0.4,
          fontFace: "Calibri",
          fontSize: 16,
          bold: true,
          color: "111827",
          align: isRTL ? "right" : "left",
        });

        // content box
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.7,
          y: 0.95,
          w: W - 1.4,
          h: H - 1.75,
          fill: { color: "FFFFFF" },
          line: { color: "E5E7EB" },
          radius: 10,
        });

        slide.addText(chunk, {
          x: 1.0,
          y: 1.15,
          w: W - 2.0,
          h: H - 2.2,
          fontFace: "Calibri",
          fontSize: 18,
          color: "111827",
          align: isRTL ? "right" : "left",
          valign: "top",
          lineSpacingMultiple: 1.12,
        });

        slide.addText("engineerit.ai", {
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
    }

    const buf: Buffer = await pptx.write("nodebuffer");

    const requested = body.filename
      ? safeFilename(body.filename)
      : `engineerit-ai-${nowStamp()}`;

    const outName = requested.toLowerCase().endsWith(".pptx")
      ? requested
      : `${requested}.pptx`;

    return new NextResponse(buf, {
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
