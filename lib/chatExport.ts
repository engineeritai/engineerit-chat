import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";
import type { Locale } from "@/lib/i18n";
import type { StoredMessage } from "@/lib/historyDb";
import { containsArabic, visualLine } from "@/lib/arabicShape";

const labels = {
  en: { you: "You", assistant: "Assistant", attachment: "Attachment", issued: "Issued by engineerit.ai" },
  ar: { you: "أنت", assistant: "المساعد", attachment: "مرفق", issued: "صادر عن engineerit.ai" },
} as const;

function copy(locale: Locale) {
  return labels[locale];
}

function messageBlocks(message: StoredMessage, locale: Locale) {
  const ui = copy(locale);
  const who = message.role === "user" ? ui.you : ui.assistant;
  const lines = [message.content || ""];
  for (const attachment of message.attachments) {
    lines.push(`${ui.attachment}: ${attachment.name}`);
  }
  return { who, text: lines.join("\n") };
}

type DrawnLine = { text: string; rtl: boolean };

function wrapBlock(text: string, font: PDFFont, size: number, maxWidth: number): DrawnLine[] {
  const lines: DrawnLine[] = [];
  for (const paragraph of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!paragraph.trim()) {
      lines.push({ text: "", rtl: false });
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    const push = (logical: string) => {
      lines.push({ text: visualLine(logical), rtl: containsArabic(logical) });
    };
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(visualLine(candidate), size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) push(current);
      if (font.widthOfTextAtSize(visualLine(word), size) <= maxWidth) {
        current = word;
        continue;
      }
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (font.widthOfTextAtSize(visualLine(next), size) <= maxWidth) {
          chunk = next;
        } else {
          if (chunk) push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    }
    if (current) push(current);
  }
  return lines;
}

let fontBytes: Uint8Array | null = null;

async function loadFont() {
  if (fontBytes) return fontBytes;
  const file = path.join(process.cwd(), "assets/fonts/NotoSansArabic-Regular.ttf");
  fontBytes = new Uint8Array(await readFile(file));
  return fontBytes;
}

export async function buildChatPdf(args: {
  title: string;
  messages: StoredMessage[];
  locale: Locale;
}): Promise<Uint8Array> {
  const ui = copy(args.locale);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(await loadFont(), { subset: true });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const bodySize = 11;
  const lineHeight = 16;
  const maxWidth = pageWidth - margin * 2;
  const title = args.title.trim() || "engineerit.ai";
  const titleVisual = visualLine(title);
  const titleRtl = containsArabic(title);

  const drawHeader = (page: PDFPage) => {
    const yTop = pageHeight - margin;
    const titleWidth = font.widthOfTextAtSize(titleVisual, 16);
    page.drawText(titleVisual || " ", {
      x: titleRtl ? pageWidth - margin - titleWidth : margin,
      y: yTop - 18,
      size: 16,
      font,
      color: rgb(0.07, 0.09, 0.14),
    });
    page.drawText(ui.issued, {
      x: args.locale === "ar" ? pageWidth - margin - font.widthOfTextAtSize(ui.issued, 9) : margin,
      y: yTop - 36,
      size: 9,
      font,
      color: rgb(0.42, 0.45, 0.5),
    });
    page.drawLine({
      start: { x: margin, y: yTop - 46 },
      end: { x: pageWidth - margin, y: yTop - 46 },
      thickness: 1,
      color: rgb(0.9, 0.91, 0.93),
    });
    return yTop - 64;
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = drawHeader(page);

  const drawLine = (line: DrawnLine, size: number) => {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = drawHeader(page);
    }
    const width = line.text ? font.widthOfTextAtSize(line.text, size) : 0;
    page.drawText(line.text || " ", {
      x: line.rtl ? pageWidth - margin - width : margin,
      y,
      size,
      font,
      color: rgb(0.07, 0.09, 0.14),
    });
    y -= lineHeight;
  };

  for (const message of args.messages) {
    const block = messageBlocks(message, args.locale);
    drawLine({ text: visualLine(block.who), rtl: containsArabic(block.who) }, 12);
    for (const line of wrapBlock(block.text, font, bodySize, maxWidth)) drawLine(line, bodySize);
    y -= 8;
  }

  return pdfDoc.save();
}

export async function buildChatDocx(args: {
  title: string;
  messages: StoredMessage[];
  locale: Locale;
}): Promise<Uint8Array> {
  const ui = copy(args.locale);
  const rtlDoc = args.locale === "ar";
  const children: Paragraph[] = [];

  for (const message of args.messages) {
    const block = messageBlocks(message, args.locale);
    const rtl = containsArabic(block.text) || rtlDoc;
    children.push(
      new Paragraph({
        bidirectional: rtl,
        alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: block.who,
            bold: true,
            font: "Calibri",
            size: 22,
            rightToLeft: rtl,
          }),
        ],
      })
    );
    for (const line of block.text.split(/\r?\n/)) {
      const lineRtl = containsArabic(line) || rtlDoc;
      children.push(
        new Paragraph({
          bidirectional: lineRtl,
          alignment: lineRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [
            new TextRun({
              text: line || " ",
              font: "Calibri",
              size: 22,
              rightToLeft: lineRtl,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                bidirectional: rtlDoc,
                alignment: rtlDoc ? AlignmentType.RIGHT : AlignmentType.LEFT,
                children: [
                  new TextRun({ text: args.title || "engineerit.ai", bold: true, font: "Calibri", size: 24, rightToLeft: rtlDoc }),
                  new TextRun({ text: `  •  ${ui.issued}`, font: "Calibri", size: 18, color: "6B7280", rightToLeft: rtlDoc }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: ["engineerit.ai  ", PageNumber.CURRENT],
                    font: "Calibri",
                    size: 18,
                    color: "6B7280",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export function exportFilename(title: string, extension: "pdf" | "docx") {
  const base = title.trim().slice(0, 80) || "engineerit-chat";
  const ascii = base.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "engineerit-chat";
  const utf = encodeURIComponent(`${base}.${extension}`);
  return `attachment; filename="${ascii}.${extension}"; filename*=UTF-8''${utf}`;
}
