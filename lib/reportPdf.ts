import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, PDFString, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { containsArabic, visualTokens } from "@/lib/arabicShape";
import { blockDir, plainInline, type Block } from "@/lib/messageDocument";
import { isOutputDisclaimer, outputDisclaimer, OUTPUT_DISCLAIMER_GRAY, OUTPUT_POLICY_URL } from "@/lib/outputDisclaimer";
import { REPORT_FOOTER_LINE, type PreparedReport, type ReportImage } from "@/lib/reportModel";

const PORTRAIT = { w: 595.28, h: 841.89 };
const LANDSCAPE = { w: 841.89, h: 595.28 };
const MARGIN = 46;
const INK = rgb(0.059, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const DISCLAIMER_INK = rgb(
  parseInt(OUTPUT_DISCLAIMER_GRAY.slice(1, 3), 16) / 255,
  parseInt(OUTPUT_DISCLAIMER_GRAY.slice(3, 5), 16) / 255,
  parseInt(OUTPUT_DISCLAIMER_GRAY.slice(5, 7), 16) / 255
);
const BRAND = rgb(0.102, 0.337, 1);
const LINE = rgb(0.816, 0.843, 0.89);
const TINT = rgb(0.906, 0.933, 1);
const ZEBRA = rgb(0.973, 0.98, 0.988);
const WHITE = rgb(1, 1, 1);

type Fonts = { body: PDFFont; bold: PDFFont; arabic: PDFFont };
type Sheet = { page: PDFPage; width: number; height: number };

function tokenFont(token: string, fonts: Fonts, bold: boolean): PDFFont {
  return containsArabic(token) ? fonts.arabic : bold ? fonts.bold : fonts.body;
}

function lineWidth(text: string, fonts: Fonts, size: number, bold: boolean): number {
  return visualTokens(text).reduce((sum, token) => sum + tokenFont(token, fonts, bold).widthOfTextAtSize(token, size), 0);
}

function addUriLink(page: PDFPage, x: number, y: number, width: number, height: number, url: string) {
  const context = page.doc.context;
  const annot = context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  const ref = context.register(annot);
  const existing = page.node.lookup(PDFName.of("Annots"));
  if (existing) {
    const list = existing as unknown as { push: (item: unknown) => void };
    list.push(ref);
    return;
  }
  page.node.set(PDFName.of("Annots"), context.obj([ref]));
}

function linkUrlInLine(page: PDFPage, line: string, x: number, y: number, fonts: Fonts, size: number, url: string) {
  let cursor = x;
  for (const token of visualTokens(line)) {
    const font = tokenFont(token, fonts, false);
    const width = font.widthOfTextAtSize(token, size);
    const at = token.indexOf(url);
    if (at >= 0) {
      const before = token.slice(0, at);
      const beforeW = before ? font.widthOfTextAtSize(before, size) : 0;
      const urlW = font.widthOfTextAtSize(url, size);
      const linkX = cursor + beforeW;
      addUriLink(page, linkX, y - 2, urlW, size + 4, url);
      page.drawLine({
        start: { x: linkX, y: y - 1.2 },
        end: { x: linkX + urlW, y: y - 1.2 },
        thickness: 0.4,
        color: DISCLAIMER_INK,
      });
    }
    cursor += width;
  }
}

function drawLogicalLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fonts: Fonts,
  size: number,
  bold: boolean,
  color: ReturnType<typeof rgb>
) {
  let cursor = x;
  for (const token of visualTokens(text)) {
    const font = tokenFont(token, fonts, bold);
    const width = font.widthOfTextAtSize(token, size);
    if (token.trim()) page.drawText(token, { x: cursor, y, size, font, color });
    cursor += width;
  }
}

function wrap(text: string, fonts: Fonts, size: number, maxWidth: number, bold = false): string[] {
  const plain = plainInline(text);
  const words = plain.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const widthOf = (value: string) => lineWidth(value, fonts, size, bold);
  const pushWord = (word: string) => {
    if (widthOf(word) <= maxWidth) {
      current = word;
      return;
    }
    let chunk = "";
    for (const ch of word) {
      const next = chunk + ch;
      if (widthOf(next) <= maxWidth) chunk = next;
      else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  };
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOf(candidate) <= maxWidth) current = candidate;
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
  const wordmark = await pdf.embedPng(report.wordmark);
  const sheets: Sheet[] = [];
  const rtlDoc = report.locale === "ar";

  const addPage = (landscape: boolean) => {
    const size = landscape ? LANDSCAPE : PORTRAIT;
    const page = pdf.addPage([size.w, size.h]);
    sheets.push({ page, width: size.w, height: size.h });
    return { page, size };
  };

  const drawHeader = (page: PDFPage, size: { w: number; h: number }) => {
    const icon = 14;
    const gap = 10;
    const title = report.title;
    const width = lineWidth(title, fonts, 11, true);
    const iconX = rtlDoc ? size.w - MARGIN - icon : MARGIN;
    page.drawImage(logo, { x: iconX, y: size.h - 34, width: icon, height: icon });
    const minX = MARGIN + (rtlDoc ? 0 : icon + gap);
    const maxRight = size.w - MARGIN - (rtlDoc ? icon + gap : 0);
    let titleX = rtlDoc ? minX : maxRight - width;
    if (titleX < minX) titleX = minX;
    if (titleX + width > maxRight) titleX = Math.max(minX, maxRight - width);
    drawLogicalLine(page, title, titleX, size.h - 30, fonts, 11, true, INK);
    page.drawLine({
      start: { x: MARGIN, y: size.h - 42 },
      end: { x: size.w - MARGIN, y: size.h - 42 },
      thickness: 2,
      color: BRAND,
    });
  };

  const cover = addPage(false);
  const wordmarkW = 400;
  const wordmarkH = wordmarkW * (wordmark.height / wordmark.width);
  cover.page.drawImage(wordmark, {
    x: (cover.size.w - wordmarkW) / 2,
    y: cover.size.h - 192,
    width: wordmarkW,
    height: wordmarkH,
  });
  const titleLines = wrap(report.title, fonts, 26, cover.size.w - MARGIN * 2, true);
  let y = cover.size.h - 230;
  for (const line of titleLines) {
    const width = lineWidth(line, fonts, 26, true);
    drawLogicalLine(cover.page, line, (cover.size.w - width) / 2, y, fonts, 26, true, INK);
    y -= 34;
  }
  const subW = lineWidth(report.subtitle, fonts, 13, false);
  drawLogicalLine(cover.page, report.subtitle, (cover.size.w - subW) / 2, y - 8, fonts, 13, false, MUTED);
  const stampW = lineWidth(report.stamp, fonts, 11, false);
  drawLogicalLine(cover.page, report.stamp, (cover.size.w - stampW) / 2, y - 32, fonts, 11, false, BRAND);

  let current = addPage(false);
  drawHeader(current.page, current.size);
  y = current.size.h - 64;

  const gap = () => {
    y -= 8;
  };
  const newContentPage = (landscape: boolean) => {
    current = addPage(landscape);
    drawHeader(current.page, current.size);
    y = current.size.h - 64;
  };
  const ensure = (height: number, landscape = false) => {
    if (y - height < 96) newContentPage(landscape);
  };

  const drawLines = (lines: string[], size: number, bold: boolean, indent: number, alignRtl: boolean) => {
    const step = size + 4;
    ensure(lines.length * step + 4, false);
    for (const line of lines) {
      const width = lineWidth(line, fonts, size, bold);
      const usable = current.page.getWidth();
      const x = alignRtl ? usable - MARGIN - indent - width : MARGIN + indent;
      drawLogicalLine(current.page, line, x, y, fonts, size, bold, INK);
      y -= step;
    }
  };

  const tableLayout = (headers: string[], rows: string[][]) => {
    const sample = headers.map((header, index) => {
      const cells = [header, ...rows.map((row) => row[index] || "")];
      return Math.max(36, ...cells.map((cell) => Math.min(lineWidth(plainInline(cell), fonts, 8, false) + 14, 220)));
    });
    const natural = sample.reduce((sum, width) => sum + width, 0);
    const portraitUsable = PORTRAIT.w - MARGIN * 2;
    return { sample, natural, landscape: headers.length >= 7 || natural > portraitUsable + 8 };
  };

  const drawTable = (headers: string[], rows: string[][], heading?: { text: string; level: number }) => {
    const { sample, natural, landscape } = tableLayout(headers, rows);
    const pageW = landscape ? LANDSCAPE.w : PORTRAIT.w;
    const usable = pageW - MARGIN * 2;
    const widths = sample.map((width) => (width / natural) * usable);
    const tableRtl = rtlDoc || headers.some((header) => containsArabic(header));
    if (landscape !== (current.page.getWidth() > current.page.getHeight())) newContentPage(landscape);

    const headingSize = heading ? (heading.level === 1 ? 18 : heading.level === 2 ? 15 : heading.level === 3 ? 13 : 12) : 0;
    const headingLines = heading ? wrap(heading.text, fonts, headingSize, current.page.getWidth() - MARGIN * 2, true) : [];
    const headingStep = headingSize + 4;
    const headingHeight = headingLines.length ? headingLines.length * headingStep + (heading!.level === 1 ? 8 : 4) : 0;
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
          const size = header ? 9 : 8;
          const width = lineWidth(line, fonts, size, header);
          const textX = tableRtl ? colX + widths[index] - 5 - width : colX + 5;
          drawLogicalLine(current.page, line, textX, top - 12 - lineIndex * (header ? 12 : 11), fonts, size, header, INK);
        });
      });
      y -= laid.height;
    };

    const headerLaid = rowHeight(headers, true);
    if (y - (headingHeight + headerLaid.height) < 96) newContentPage(landscape);
    if (heading && headingLines.length) {
      y -= heading.level === 1 ? 8 : 4;
      const alignRtl = blockDir(heading.text, report.locale) === "rtl";
      for (const line of headingLines) {
        const width = lineWidth(line, fonts, headingSize, true);
        const usableW = current.page.getWidth();
        const x = alignRtl ? usableW - MARGIN - width : MARGIN;
        drawLogicalLine(current.page, line, x, y, fonts, headingSize, true, INK);
        y -= headingStep;
      }
    }

    const paintHeader = () => paint(headers, true, TINT);
    paintHeader();
    rows.forEach((row, index) => {
      const laid = rowHeight(row, false);
      if (y - laid.height < 96) {
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

  // A short lead-in followed by a wide table belongs on that table's landscape
  // page. Otherwise the portrait page is left with a heading and a blank body.
  const shortLeadOnLandscape = () => {
    let chars = 0;
    for (const block of report.blocks) {
      if (block.type === "paragraph" && isOutputDisclaimer(plainInline(block.text), report.locale)) continue;
      if (block.type === "heading" || block.type === "paragraph") {
        chars += plainInline(block.text).length;
        if (chars > 400) return false;
        continue;
      }
      if (block.type === "table") return tableLayout(block.headers, block.rows).landscape;
      return false;
    }
    return false;
  };
  if (shortLeadOnLandscape()) {
    pdf.removePage(pdf.getPageCount() - 1);
    sheets.pop();
    current = addPage(true);
    drawHeader(current.page, current.size);
    y = current.size.h - 64;
  }

  const nextBlock = (start: number) => {
    for (let index = start; index < report.blocks.length; index += 1) {
      const block = report.blocks[index];
      if (block.type === "paragraph" && isOutputDisclaimer(plainInline(block.text), report.locale)) continue;
      return block;
    }
    return null;
  };

  for (let index = 0; index < report.blocks.length; index += 1) {
    const block = report.blocks[index];
    if (block.type === "heading" && nextBlock(index + 1)?.type === "table") continue;
    const heading = block.type === "table" ? previousHeading(index) : undefined;
    await paintBlock(block, heading);
  }

  function previousHeading(tableIndex: number) {
    for (let index = tableIndex - 1; index >= 0; index -= 1) {
      const block = report.blocks[index];
      if (block.type === "paragraph" && isOutputDisclaimer(plainInline(block.text), report.locale)) continue;
      return block.type === "heading" ? block : undefined;
    }
    return undefined;
  }

  async function paintBlock(block: Block, heading?: { text: string; level: number }) {
    if (block.type === "heading") {
      const size = block.level === 1 ? 18 : block.level === 2 ? 15 : block.level === 3 ? 13 : 12;
      const lines = wrap(block.text, fonts, size, current.page.getWidth() - MARGIN * 2, true);
      y -= block.level === 1 ? 8 : 4;
      drawLines(lines, size, true, 0, blockDir(block.text, report.locale) === "rtl");
      return;
    }
    if (block.type === "paragraph") {
      if (isOutputDisclaimer(plainInline(block.text), report.locale)) return;
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
      drawTable(block.headers, block.rows, heading);
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
    const disclaimer = outputDisclaimer(report.locale);
    const policyUrl = OUTPUT_POLICY_URL[report.locale];
  sheets.forEach((sheet, index) => {
    const pageLabel = report.locale === "ar" ? `صفحة ${index + 1} من ${total}` : `Page ${index + 1} of ${total}`;
    const pageW = lineWidth(pageLabel, fonts, 9, false);
    const brand = REPORT_FOOTER_LINE;
    const brandW = fonts.body.widthOfTextAtSize(brand, 9);
    const icon = 12;
    const gap = 5;
    const noteLines = wrap(disclaimer, fonts, 8, sheet.width - MARGIN * 2);
    const lineY = 52 + noteLines.length * 10;
    sheet.page.drawLine({
      start: { x: MARGIN, y: lineY },
      end: { x: sheet.width - MARGIN, y: lineY },
      thickness: 0.6,
      color: LINE,
    });
    noteLines.forEach((line, lineIndex) => {
      const width = lineWidth(line, fonts, 8, false);
      const x = rtlDoc ? sheet.width - MARGIN - width : MARGIN;
      const y = lineY - 12 - lineIndex * 10;
      drawLogicalLine(sheet.page, line, x, y, fonts, 8, false, DISCLAIMER_INK);
      linkUrlInLine(sheet.page, line, x, y, fonts, 8, policyUrl);
    });
    const logoX = rtlDoc ? sheet.width - MARGIN - icon : MARGIN;
    sheet.page.drawImage(logo, { x: logoX, y: 16, width: icon, height: icon });
    const brandX = rtlDoc ? logoX - gap - brandW : logoX + icon + gap;
    sheet.page.drawText(brand, { x: brandX, y: 18, size: 9, font: fonts.body, color: MUTED });
    const pageX = rtlDoc ? MARGIN : sheet.width - MARGIN - pageW;
    drawLogicalLine(sheet.page, pageLabel, pageX, 18, fonts, 9, false, MUTED);
  });

  return pdf.save();
}
