// app/api/export/diagram/pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  title?: string;
  content?: string;
  filename?: string;
};

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

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const fontUI = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageW = 595.28; // A4
    const pageH = 841.89; // A4
    const margin = 42;
    const lineH = 16;
    const fontSize = 12;

    const lines = content.replace(/\r\n/g, "\n").split("\n");

    const linesPerPage = Math.floor((pageH - margin * 2 - 70) / lineH);

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

      // Footer
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
