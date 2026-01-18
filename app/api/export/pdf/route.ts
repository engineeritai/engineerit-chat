// app/api/export/pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  title?: string;
  content?: string;
  text?: string; // support old clients
  filename?: string;
};

function safeFilename(name: string) {
  return (
    name
      .trim()
      .replace(/[^\w\-(). ]+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "engineerit-ai"
  );
}

// Basic wrap by measuring width
function wrapText(text: string, font: any, fontSize: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

  for (const para of paragraphs) {
    const p = para.trimEnd();
    if (!p) {
      lines.push("");
      continue;
    }

    const words = p.split(/\s+/);
    let current = "";

    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      const width = font.widthOfTextAtSize(test, fontSize);

      if (width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        // if a single word too long, hard split
        if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            const t2 = chunk + ch;
            if (font.widthOfTextAtSize(t2, fontSize) <= maxWidth) {
              chunk = t2;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        } else {
          current = w;
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines;
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

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4
    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const margin = 48;
    const headerHeight = 56;
    const fontSize = 12;
    const lineHeight = 16;

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2 - headerHeight;

    const lines = wrapText(content, font, fontSize, usableWidth);

    const drawHeader = (page: any) => {
      const yTop = pageHeight - margin;

      page.drawText(title, {
        x: margin,
        y: yTop - 20,
        size: 16,
        font: fontBold,
        color: rgb(0.07, 0.09, 0.14),
      });

      page.drawText("Issued by engineerit.ai", {
        x: margin,
        y: yTop - 38,
        size: 9,
        font,
        color: rgb(0.42, 0.45, 0.5),
      });

      page.drawLine({
        start: { x: margin, y: yTop - 48 },
        end: { x: pageWidth - margin, y: yTop - 48 },
        thickness: 1,
        color: rgb(0.9, 0.91, 0.93),
      });

      return yTop - headerHeight;
    };

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yStart = drawHeader(page);
    let used = 0;

    for (const line of lines) {
      if (used * lineHeight > usableHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yStart = drawHeader(page);
        used = 0;
      }

      const y = yStart - used * lineHeight - lineHeight;
      page.drawText(line || " ", {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.07, 0.09, 0.14),
      });

      used++;
    }

    const bytes = await pdfDoc.save();

    const requested = body.filename ? safeFilename(body.filename) : "engineerit-ai";
    const outName = requested.toLowerCase().endsWith(".pdf")
      ? requested
      : `${requested}.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("PDF export error:", err);
    return new NextResponse(
      `PDF export failed: ${err?.message || "Unknown error"}`,
      { status: 500 }
    );
  }
}
