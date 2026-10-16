import { readFileSync } from "fs";
import { join } from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { InvoiceDocument } from "@/lib/invoiceDocument";

const MARGIN = 48;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ink = rgb(0.067, 0.094, 0.153);
const muted = rgb(0.42, 0.447, 0.502);
const line = rgb(0.898, 0.906, 0.922);
const brand = rgb(0.145, 0.388, 0.922);
const soft = rgb(0.973, 0.98, 0.988);
type KitFont = {
  layout: (text: string) => { glyphs: { id: number }[] };
};

type Fonts = { text: PDFFont; strong: PDFFont; arabic: PDFFont; latinKit: KitFont; arabicKit: KitFont };

/** Every download and email attachment calls this. Nothing reads a stored PDF. */
export async function renderInvoicePdf(doc: InvoiceDocument) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const latinBytes = readFileSync(join(process.cwd(), "assets/fonts/Inter-Regular.ttf"));
  const strongBytes = readFileSync(join(process.cwd(), "assets/fonts/Inter-SemiBold.ttf"));
  const arabicBytes = readFileSync(join(process.cwd(), "assets/fonts/NotoSansArabic-Regular.ttf"));
  const fonts: Fonts = {
    text: await pdf.embedFont(latinBytes, { subset: true }),
    strong: await pdf.embedFont(strongBytes, { subset: true }),
    arabic: await pdf.embedFont(arabicBytes, { subset: true }),
    latinKit: fontkit.create(latinBytes) as KitFont,
    arabicKit: fontkit.create(arabicBytes) as KitFont,
  };
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: brand });

  const rtl = doc.locale === "ar";
  let y = PAGE_HEIGHT - 36;
  y = await drawHeader(pdf, page, fonts, doc, rtl, y);
  y = drawBillTo(page, fonts, doc, rtl, y);
  y = drawRows(page, fonts, doc, rtl, y);
  y = drawTotal(page, fonts, doc, rtl, y);
  drawNotes(page, fonts, doc, rtl, y);
  drawFooter(page, fonts, doc);

  return pdf.save();
}

async function drawHeader(
  pdf: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  doc: InvoiceDocument,
  rtl: boolean,
  y: number
) {
  let logoW = 0;
  try {
    const bytes = readFileSync(join(process.cwd(), "assets/invoice-logo.png"));
    const logo = await pdf.embedPng(bytes);
    const height = 34;
    logoW = Math.min(150, logo.width * (height / logo.height));
    const x = rtl ? PAGE_WIDTH - MARGIN - logoW : MARGIN;
    page.drawImage(logo, { x, y: y - height + 8, width: logoW, height });
  } catch {
    logoW = 0;
  }

  const brandX = rtl ? MARGIN : MARGIN + (logoW ? logoW + 12 : 0);
  const brandW = rtl ? CONTENT_WIDTH - logoW - 12 : CONTENT_WIDTH - logoW - 12;
  drawLine(page, fonts, "engineerit.ai", y - 4, brandX, Math.max(80, brandW), rtl ? "right" : "left", 13, ink, true);
  drawLine(page, fonts, "info@engineerit.ai", y - 22, brandX, Math.max(80, brandW), rtl ? "right" : "left", 10, muted, false);

  y -= 58;
  drawLine(page, fonts, doc.title, y, MARGIN, CONTENT_WIDTH, rtl ? "right" : "left", 22, ink, true);
  y -= 26;
  const meta = `${doc.invoiceNumber}  |  ${doc.issuedOn}`;
  drawLine(page, fonts, meta, y, MARGIN, CONTENT_WIDTH, rtl ? "right" : "left", 11, muted, false);
  y -= 16;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: line,
  });
  return y - 22;
}

function drawBillTo(page: PDFPage, fonts: Fonts, doc: InvoiceDocument, rtl: boolean, y: number) {
  const align = rtl ? "right" : "left";
  drawLine(page, fonts, doc.billToLabel, y, MARGIN, CONTENT_WIDTH, align, 10, muted, true);
  y -= 16;
  drawLine(page, fonts, doc.customerName, y, MARGIN, CONTENT_WIDTH, align, 13, ink, true);
  y -= 16;
  if (doc.customerEmail) {
    drawLine(page, fonts, doc.customerEmail, y, MARGIN, CONTENT_WIDTH, align, 11, muted, false);
    y -= 16;
  }
  return y - 8;
}

function drawRows(page: PDFPage, fonts: Fonts, doc: InvoiceDocument, rtl: boolean, y: number) {
  for (const row of doc.rows) {
    if (y < 120) break;
    const labelW = 180;
    if (rtl) {
      drawLine(page, fonts, row.label, y, MARGIN + CONTENT_WIDTH - labelW, labelW, "right", 11, muted, false);
      drawLine(page, fonts, row.value, y, MARGIN, CONTENT_WIDTH - labelW - 12, "left", 11, ink, false);
    } else {
      drawLine(page, fonts, row.label, y, MARGIN, labelW, "left", 11, muted, false);
      drawLine(page, fonts, row.value, y, MARGIN + labelW, CONTENT_WIDTH - labelW, "right", 11, ink, false);
    }
    y -= 20;
  }
  return y - 6;
}

function drawTotal(page: PDFPage, fonts: Fonts, doc: InvoiceDocument, rtl: boolean, y: number) {
  page.drawRectangle({
    x: MARGIN,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 36,
    color: soft,
  });
  const textY = y - 2;
  if (rtl) {
    drawLine(page, fonts, doc.totalValue, textY, MARGIN + 12, CONTENT_WIDTH * 0.55, "left", 14, ink, true);
    drawLine(page, fonts, doc.totalLabel, textY, MARGIN + CONTENT_WIDTH * 0.45, CONTENT_WIDTH * 0.55 - 12, "right", 12, muted, true);
  } else {
    drawLine(page, fonts, doc.totalLabel, textY, MARGIN + 12, CONTENT_WIDTH * 0.45, "left", 12, muted, true);
    drawLine(page, fonts, doc.totalValue, textY, MARGIN + CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.6 - 12, "right", 14, ink, true);
  }
  return y - 36;
}

function drawNotes(page: PDFPage, fonts: Fonts, doc: InvoiceDocument, rtl: boolean, y: number) {
  const align = rtl ? "right" : "left";
  for (const note of doc.notes) {
    drawLine(page, fonts, note, y, MARGIN, CONTENT_WIDTH, align, 9, muted, false);
    y -= 14;
  }
}

function drawFooter(page: PDFPage, fonts: Fonts, doc: InvoiceDocument) {
  page.drawLine({
    start: { x: MARGIN, y: 56 },
    end: { x: PAGE_WIDTH - MARGIN, y: 56 },
    thickness: 1,
    color: line,
  });
  drawLine(page, fonts, doc.footer, 38, MARGIN, CONTENT_WIDTH, "left", 9, muted, false);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 8, color: brand });
}

function drawLine(
  page: PDFPage,
  fonts: Fonts,
  text: string,
  y: number,
  x: number,
  width: number,
  align: "left" | "right",
  size: number,
  color: ReturnType<typeof rgb>,
  strong: boolean
) {
  const safe = sanitize(text, fonts);
  if (!safe) return;
  const direction = baseDirection(safe);
  const parts = runs(safe);
  const widthOf = (part: Run) => fontFor(fonts, part, strong).widthOfTextAtSize(part.text, size);
  const total = parts.reduce((sum, part) => sum + widthOf(part), 0);
  let cursor = align === "right" ? x + width - total : x;
  const ordered = direction === "rtl" ? parts : parts;
  if (direction === "rtl") {
    cursor = align === "right" ? x + width : x + total;
    for (const part of ordered) {
      const partWidth = widthOf(part);
      cursor -= partWidth;
      page.drawText(part.text, {
        x: cursor,
        y,
        size,
        font: fontFor(fonts, part, strong),
        color,
      });
    }
    return;
  }
  if (align === "right") cursor = x + width - total;
  for (const part of ordered) {
    page.drawText(part.text, {
      x: cursor,
      y,
      size,
      font: fontFor(fonts, part, strong),
      color,
    });
    cursor += widthOf(part);
  }
}

type Run = { text: string; arabic: boolean };

function fontFor(fonts: Fonts, part: Run, strong: boolean) {
  if (part.arabic) return fonts.arabic;
  return strong ? fonts.strong : fonts.text;
}

function runs(text: string): Run[] {
  const parts: Run[] = [];
  let buf = "";
  let arabic = false;
  const flush = () => {
    if (!buf) return;
    parts.push({ text: buf, arabic });
    buf = "";
  };
  for (const ch of text) {
    const next = isArabicScript(ch);
    if (!buf) {
      buf = ch;
      arabic = next;
      continue;
    }
    if (next === arabic) {
      buf += ch;
      continue;
    }
    flush();
    buf = ch;
    arabic = next;
  }
  flush();
  return parts;
}

function baseDirection(text: string) {
  for (const ch of text) {
    if (isArabicScript(ch)) return "rtl" as const;
  }
  return "ltr" as const;
}

function isArabicScript(ch: string) {
  const cp = ch.codePointAt(0) || 0;
  return (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  );
}

function sanitize(text: string, fonts: Fonts) {
  let out = "";
  for (const ch of text) {
    if (ch === "\n" || ch === "\t") {
      out += " ";
      continue;
    }
    const arabic = isArabicScript(ch);
    const kit = arabic ? fonts.arabicKit : fonts.latinKit;
    const glyph = kit.layout(ch).glyphs[0];
    if (!glyph || glyph.id === 0) continue;
    out += ch;
  }
  return out.replace(/[ ]{2,}/g, " ").trim();
}
