// app/api/export/diagram/pdf/route.ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { NextResponse } from "next/server";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { containsArabic, visualTokens } from "@/lib/arabicShape";
import { OUTPUT_DISCLAIMER_GRAY, OUTPUT_POLICY_URL, outputDisclaimerBody } from "@/lib/outputDisclaimer";
import type { UiLocale } from "@/lib/replyLanguage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  title?: string;
  content?: string;
  filename?: string;
  locale?: string;
};

function wrapWords(text: string, max: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function disclaimerInk() {
  return rgb(
    parseInt(OUTPUT_DISCLAIMER_GRAY.slice(1, 3), 16) / 255,
    parseInt(OUTPUT_DISCLAIMER_GRAY.slice(3, 5), 16) / 255,
    parseInt(OUTPUT_DISCLAIMER_GRAY.slice(5, 7), 16) / 255
  );
}

function drawNotice(page: PDFPage, font: PDFFont, lines: string[], pageW: number, margin: number) {
  const color = disclaimerInk();
  lines.forEach((line, index) => {
    const y = margin + 28 - index * 11;
    if (!containsArabic(line)) {
      page.drawText(line, { x: margin, y, size: 8, font, color });
      return;
    }
    const tokens = visualTokens(line);
    const width = tokens.reduce((sum, token) => sum + font.widthOfTextAtSize(token, 8), 0);
    let cursor = pageW - margin - width;
    for (const token of tokens) {
      const tokenWidth = font.widthOfTextAtSize(token, 8);
      if (token.trim()) page.drawText(token, { x: cursor, y, size: 8, font, color });
      cursor += tokenWidth;
    }
  });
}

function safeFilename(name: string) {
  return (
    name
      .trim()
      .replace(/[^\w\-(). ]+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "engineerit-diagram"
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ReqBody>;
    const content = (body.content || "").toString();
    if (!content.trim()) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const title = (body.title || "engineerit.ai diagram").toString();
    const locale: UiLocale = body.locale === "ar" ? "ar" : "en";
    const footerLines = [...wrapWords(outputDisclaimerBody(locale), 88), OUTPUT_POLICY_URL[locale]];

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const fontUI = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const noticeFont =
      locale === "ar"
        ? await pdfDoc.embedFont(await readFile(path.join(process.cwd(), "assets/fonts/NotoSansArabic-Regular.ttf")), { subset: true })
        : fontUI;

    const pageW = 595.28; // A4
    const pageH = 841.89; // A4
    const margin = 42;
    const lineH = 16;
    const fontSize = 12;

    const lines = content.replace(/\r\n/g, "\n").split("\n");

    const linesPerPage = Math.floor((pageH - margin * 2 - 70 - footerLines.length * 11) / lineH);

    let idx = 0;
    let pageNo = 1;

    while (idx < lines.length) {
      const page = pdfDoc.addPage([pageW, pageH]);

      // Header
      page.drawText(title, {
        x: margin,
        y: pageH - margin - 20,
        size: 14,
        font: fontUI,
        color: rgb(0.07, 0.09, 0.12),
      });

      page.drawText("engineerit.ai", {
        x: pageW - margin - 90,
        y: pageH - margin - 20,
        size: 12,
        font: fontUI,
        color: rgb(0.14, 0.39, 0.92),
      });

      // Separator line
      page.drawLine({
        start: { x: margin, y: pageH - margin - 30 },
        end: { x: pageW - margin, y: pageH - margin - 30 },
        thickness: 1,
        color: rgb(0.9, 0.91, 0.92),
      });

      // Body
      let y = pageH - margin - 55;
      for (let i = 0; i < linesPerPage && idx < lines.length; i++, idx++) {
        const line = lines[idx] ?? "";
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.07, 0.09, 0.12),
        });
        y -= lineH;
      }

      const bodyLines = footerLines.slice(0, -1);
      const url = footerLines[footerLines.length - 1] || "";
      drawNotice(page, noticeFont, bodyLines, pageW, margin);
      const urlY = margin + 28 - bodyLines.length * 11;
      page.drawText(url, {
        x: margin,
        y: urlY,
        size: 8,
        font: fontUI,
        color: disclaimerInk(),
      });
      const urlWidth = fontUI.widthOfTextAtSize(url, 8);
      const link = page.doc.context.register(
        page.doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [margin, urlY - 2, margin + urlWidth, urlY + 10],
          Border: [0, 0, 0],
          A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
        })
      );
      const annots = page.node.lookup(PDFName.of("Annots"));
      if (annots) (annots as unknown as { push: (item: unknown) => void }).push(link);
      else page.node.set(PDFName.of("Annots"), page.doc.context.obj([link]));
      page.drawText(`Page ${pageNo}`, {
        x: pageW - margin - 60,
        y: margin - 10,
        size: 10,
        font: fontUI,
        color: rgb(0.42, 0.45, 0.5),
      });

      pageNo++;
    }

    const pdfBytes = await pdfDoc.save();
    const u8 = new Uint8Array(pdfBytes);

    const requested = body.filename ? safeFilename(body.filename) : "engineerit-diagram";
    const outName = requested.toLowerCase().endsWith(".pdf") ? requested : `${requested}.pdf`;

    return new NextResponse(u8 as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "PDF diagram export failed", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
