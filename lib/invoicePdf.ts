import { readFileSync } from "fs";
import { join } from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { visualLine } from "@/lib/arabicShape";

export async function renderInvoicePdf(text: string) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = readFileSync(join(process.cwd(), "assets/fonts/NotoSansArabic-Regular.ttf"));
  const font = await doc.embedFont(fontBytes, { subset: true });
  let page = doc.addPage([595, 842]);
  let y = 800;
  const lines = text.split("\n").flatMap((line) => wrapVisual(visualLine(line), 80));
  for (const line of lines) {
    if (y < 56) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(line, {
      x: 48,
      y,
      size: 12,
      font,
      color: rgb(0.07, 0.09, 0.12),
    });
    y -= 18;
  }
  return doc.save();
}

function wrapVisual(line: string, width: number) {
  if (!line) return [""];
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += width) parts.push(line.slice(i, i + width));
  return parts;
}
