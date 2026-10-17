import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { containsArabic, visualLine } from "@/lib/arabicShape";
import { blockDir, plainInline, type Block } from "@/lib/messageDocument";
import type { PreparedReport, ReportImage } from "@/lib/reportModel";

const PORTRAIT = { w: 595.28, h: 841.89 };
const LANDSCAPE = { w: 841.89, h: 595.28 };
const MARGIN = 46;
const INK = rgb(0.059, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const BRAND = rgb(0.102, 0.337, 1);
const LINE = rgb(0.816, 0.843, 0.89);
const TINT = rgb(0.906, 0.933, 1);
const ZEBRA = rgb(0.973, 0.98, 0.988);
const WHITE = rgb(1, 1, 1);

type Fonts = { body: PDFFont; bold: PDFFont; arabic: PDFFont };
type Sheet = { page: PDFPage; width: number; height: number };

function pickFont(text: string, fonts: Fonts, bold = false): PDFFont {
  return containsArabic(text) ? fonts.arabic : bold ? fonts.bold : fonts.body;
}

function measure(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(visualLine(text) || " ", size);
}

function wrap(text: string, fonts: Fonts, size: number, maxWidth: number, bold = false): string[] {
  const plain = plainInline(text);
  const font = pickFont(plain, fonts, bold);
  const words = plain.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const pushWord = (word: string) => {
    if (measure(word, font, size) <= maxWidth) {
      current = word;
      return;
    }
    let chunk = "";
    for (const ch of word) {
      const next = chunk + ch;
      if (measure(next, font, size) <= maxWidth) chunk = next;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  };
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, font, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      pushWord(word);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function buildReportPdf(report: PreparedReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(report.title);
  pdf.setSubject(report.subtitle);
  pdf.setCreator("engineerit.ai");
  pdf.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), "assets/fonts");
  const fonts: Fonts = {
    body: await pdf.embedFont(await readFile(path.join(dir, "Inter-Regular.ttf")), { subset: true }),
    bold: await pdf.embedFont(await readFile(path.join(dir, "Inter-SemiBold.ttf")), { subset: true }),
    arabic: await pdf.embedFont(await readFile(path.join(dir, "NotoSansArabic-Regular.ttf")), { subset: true }),
  };
  const logo = await pdf.embedPng(report.logo);
  const sheets: Sheet[] = [];
  const rtlDoc = report.locale === "ar";

  const addPage = (landscape: boolean) => {
    const size = landscape ? LANDSCAPE : PORTRAIT;
    const page = pdf.addPage([size.w, size.h]);
    sheets.push({ page, width: size.w, height: size.h });
    return { page, size };
  };

  const drawHeader = (page: PDFPage, size: { w: number; h: number }) => {
    const title = report.title;
    const font = pickFont(title, fonts, true);
    const visual = visualLine(title);
    const width = font.widthOfTextAtSize(visual, 11);
    const x = rtlDoc ? size.w - MARGIN - width : MARGIN;
    page.drawText(visual || " ", { x, y: size.h - 30, size: 11, font, color: INK });
    page.drawLine({
      start: { x: MARGIN, y: size.h - 38 },
      end: { x: size.w - MARGIN, y: size.h - 38 },
      thickness: 2,
      color: BRAND,
    });
  };

  const cover = addPage(false);
  const coverFont = pickFont(report.title, fonts, true);
  cover.page.drawImage(logo, { x: (cover.size.w - 64) / 2, y: cover.size.h - 180, width: 64, height: 64 });
  const titleLines = wrap(report.title, fonts, 26, cover.size.w - MARGIN * 2, true);
  let y = cover.size.h - 230;
  for (const line of titleLines) {
    const visual = visualLine(line);
    const width = coverFont.widthOfTextAtSize(visual, 26);
    cover.page.drawText(visual, { x: (cover.size.w - width) / 2, y, size: 26, font: coverFont, color: INK });
    y -= 34;
  }
  const subFont = pickFont(report.subtitle, fonts);
  const sub = visualLine(report.subtitle);
  const subW = subFont.widthOfTextAtSize(sub, 13);
  cover.page.drawText(sub, { x: (cover.size.w - subW) / 2, y: y - 8, size: 13, font: subFont, color: MUTED });
  const stampFont = pickFont(report.stamp, fonts);
  const stamp = visualLine(report.stamp);
  const stampW = stampFont.widthOfTextAtSize(stamp, 11);
  cover.page.drawText(stamp, { x: (cover.size.w - stampW) / 2, y: y - 32, size: 11, font: stampFont, color: BRAND });

  let current = addPage(false);
  drawHeader(current.page, current.size);
  y = current.size.h - 58;

  const gap = () => {
    y -= 8;
  };
  const newContentPage = (landscape: boolean) => {
    current = addPage(landscape);
    drawHeader(current.page, current.size);
    y = current.size.h - 58;
  };
  const ensure = (height: number, landscape = false) => {
    if (y - height < 56) newContentPage(landscape);
  };

  const drawLines = (lines: string[], size: number, bold: boolean, indent: number, alignRtl: boolean) => {
    const step = size + 4;
    ensure(lines.length * step + 4, false);
    for (const line of lines) {
      const font = pickFont(line, fonts, bold);
      const visual = visualLine(line);
      const width = font.widthOfTextAtSize(visual, size);
      const usable = current.page.getWidth();
      const x = alignRtl ? usable - MARGIN - indent - width : MARGIN + indent;
      current.page.drawText(visual || " ", { x, y, size, font, color: INK });
      y -= step;
    }
  };

  const drawTable = (headers: string[], rows: string[][]) => {
    const sample = headers.map((header, index) => {
      const cells = [header, ...rows.map((row) => row[index] || "")];
      return Math.max(36, ...cells.map((cell) => Math.min(measure(plainInline(cell), pickFont(cell, fonts), 8) + 14, 220)));
    });
    const natural = sample.reduce((sum, width) => sum + width, 0);
    const portraitUsable = PORTRAIT.w - MARGIN * 2;
    const landscape = headers.length >= 7 || natural > portraitUsable + 8;
    const pageW = landscape ? LANDSCAPE.w : PORTRAIT.w;
    const usable = pageW - MARGIN * 2;
    const widths = sample.map((width) => (width / natural) * usable);
    const tableRtl = rtlDoc || headers.some((header) => containsArabic(header));
    if (landscape !== (current.page.getWidth() > current.page.getHeight())) newContentPage(landscape);

    const rowHeight = (cells: string[], header: boolean) => {
      const lines = cells.map((cell, index) => wrap(cell, fonts, header ? 9 : 8, widths[index] - 10, header));
      const count = Math.max(1, ...lines.map((item) => item.length));
      return { lines, height: count * (header ? 12 : 11) + 8 };
    };

    const paint = (cells: string[], header: boolean, fill: ReturnType<typeof rgb>) => {
      const laid = rowHeight(cells, header);
      ensure(laid.height, landscape);
      if (landscape !== (current.page.getWidth() > current.page.getHeight())) {
        newContentPage(landscape);
      }
      let x = MARGIN;
      const top = y + 2;
      cells.forEach((cell, index) => {
        const colX = tableRtl
          ? MARGIN + usable - widths.slice(0, index + 1).reduce((sum, width) => sum + width, 0)
          : x;
        if (!tableRtl) x += widths[index];
        current.page.drawRectangle({ x: colX, y: top - laid.height, width: widths[index], height: laid.height, color: fill, borderColor: LINE, borderWidth: 0.6 });
        const cellLines = laid.lines[index];
        cellLines.forEach((line, lineIndex) => {
          const font = pickFont(line, fonts, header);
          const visual = visualLine(line);
          const size = header ? 9 : 8;
          const width = font.widthOfTextAtSize(visual, size);
          const textX = tableRtl ? colX + widths[index] - 5 - width : colX + 5;
          current.page.drawText(visual || " ", {
            x: textX,
            y: top - 12 - lineIndex * (header ? 12 : 11),
            size,
            font,
            color: INK,
          });
        });
      });
      y -= laid.height;
    };

    const paintHeader = () => paint(headers, true, TINT);
    paintHeader();
    rows.forEach((row, index) => {
      if (y - 24 < 56) {
        newContentPage(landscape);
        paintHeader();
      }
      paint(row, false, index % 2 ? ZEBRA : WHITE);
    });
    gap();
  };

  const drawImage = async (image: ReportImage, caption: string) => {
    newContentPage(true);
    const png: PDFImage = await pdf.embedPng(image.png);
    const maxW = current.page.getWidth() - MARGIN * 2;
    const maxH = current.page.getHeight() - 130;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const x = (current.page.getWidth() - w) / 2;
    current.page.drawImage(png, { x, y: y - h, width: w, height: h });
    y -= h + 16;
    const lines = wrap(caption, fonts, 10, maxW);
    drawLines(lines, 10, false, 0, blockDir(caption, report.locale) === "rtl");
    gap();
  };

  for (const block of report.blocks) {
    await paintBlock(block);
  }

  async function paintBlock(block: Block) {
    if (block.type === "heading") {
      const size = block.level === 1 ? 18 : block.level === 2 ? 15 : block.level === 3 ? 13 : 12;
      const lines = wrap(block.text, fonts, size, current.page.getWidth() - MARGIN * 2, true);
      y -= block.level === 1 ? 8 : 4;
      drawLines(lines, size, true, 0, blockDir(block.text, report.locale) === "rtl");
      return;
    }
    if (block.type === "paragraph") {
      const lines = wrap(block.text, fonts, 11, current.page.getWidth() - MARGIN * 2);
      drawLines(lines, 11, false, 0, blockDir(block.text, report.locale) === "rtl");
      gap();
      return;
    }
    if (block.type === "list") {
      const paintItems = (items: typeof block.items, ordered: boolean, indent: number) => {
        items.forEach((item, index) => {
          const marker = ordered ? `${index + 1}.` : "•";
          const rtl = blockDir(item.text, report.locale) === "rtl";
          const lines = wrap(`${marker} ${plainInline(item.text)}`, fonts, 11, current.page.getWidth() - MARGIN * 2 - 8 - indent);
          drawLines(lines, 11, false, 8 + indent, rtl);
          if (item.children.length) paintItems(item.children, item.orderedChildren, indent + 14);
        });
      };
      paintItems(block.items, block.ordered, 0);
      gap();
      return;
    }
    if (block.type === "table") {
      drawTable(block.headers, block.rows);
      return;
    }
    if (block.type === "chart") {
      const image = report.images.get(block.index);
      const caption = block.model.title;
      if (image) await drawImage(image, caption);
      return;
    }
    if (block.type === "diagram") {
      const image = report.images.get(block.index);
      if (image) await drawImage(image, report.locale === "ar" ? "مخطط" : "Diagram");
      return;
    }
    if (block.type === "code") {
      const lines = wrap(block.text, fonts, 9, current.page.getWidth() - MARGIN * 2);
      drawLines(lines, 9, false, 0, blockDir(block.text, report.locale) === "rtl");
      gap();
    }
  }

  const total = sheets.length;
  sheets.forEach((sheet, index) => {
    const pageLabel = report.locale === "ar" ? `صفحة ${index + 1} من ${total}` : `Page ${index + 1} of ${total}`;
    const pageFont = pickFont(pageLabel, fonts);
    const pageVisual = visualLine(pageLabel);
    const pageW = pageFont.widthOfTextAtSize(pageVisual, 9);
    const brand = "engineer it · engineerit.ai";
    const brandW = fonts.body.widthOfTextAtSize(brand, 9);
    const stampFont = pickFont(report.stamp, fonts);
    const stampVisual = visualLine(report.stamp);
    const stampW = stampFont.widthOfTextAtSize(stampVisual, 9);
    sheet.page.drawLine({
      start: { x: MARGIN, y: 42 },
      end: { x: sheet.width - MARGIN, y: 42 },
      thickness: 0.6,
      color: LINE,
    });
    const logoX = rtlDoc ? sheet.width - MARGIN - 12 : MARGIN;
    sheet.page.drawImage(logo, { x: logoX, y: 22, width: 12, height: 12 });
    const brandX = rtlDoc ? sheet.width - MARGIN - 18 - brandW : MARGIN + 16;
    sheet.page.drawText(brand, { x: brandX, y: 24, size: 9, font: fonts.body, color: MUTED });
    sheet.page.drawText(stampVisual, { x: (sheet.width - stampW) / 2, y: 24, size: 9, font: stampFont, color: MUTED });
    const pageX = rtlDoc ? MARGIN : sheet.width - MARGIN - pageW;
    sheet.page.drawText(pageVisual, { x: pageX, y: 24, size: 9, font: pageFont, color: MUTED });
  });

  return pdf.save();
}
