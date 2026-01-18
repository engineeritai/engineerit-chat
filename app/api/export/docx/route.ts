// app/api/export/docx/route.ts
import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  PageNumber,
} from "docx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; title?: string; filename?: string };
    const text = (body?.text || "").toString();
    const title = (body?.title || "engineer it").toString();

    const lines = text.split(/\r?\n/);

    const doc = new Document({
      sections: [
        {
          properties: {},
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: title,
                      bold: true,
                      size: 22, // 11pt
                      font: "Calibri",
                    }),
                    new TextRun({
                      text: "  •  Issued by engineerit.ai",
                      size: 18, // 9pt
                      font: "Calibri",
                      color: "6B7280",
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: "engineerit.ai • User Classification",
                      size: 18,
                      font: "Calibri",
                      color: "6B7280",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      children: ["Page ", PageNumber.CURRENT],
                      size: 18,
                      font: "Calibri",
                      color: "6B7280",
                    }),
                  ],
                }),
              ],
            }),
          },
          children: lines.map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line || " ",
                    font: "Calibri",
                    size: 24, // 12pt
                  }),
                ],
              })
          ),
        },
      ],
    });

    // docx -> Buffer
    const buf = await Packer.toBuffer(doc);

    // ✅ Vercel/NextResponse type-safe: convert Buffer -> Uint8Array
    const bytes = new Uint8Array(buf);

    const filenameBase = (body.filename || "engineerit.ai").toString().trim() || "engineerit.ai";
    const outName = filenameBase.toLowerCase().endsWith(".docx")
      ? filenameBase
      : `${filenameBase}.docx`;

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return new NextResponse(`DOCX export failed: ${e?.message || "Unknown error"}`, {
      status: 500,
    });
  }
}
