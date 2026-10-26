import { directionalRuns } from "@/lib/arabicShape";
import { blockDir, plainInline } from "@/lib/messageDocument";
import { pngSize } from "@/lib/rasterSvg";
import { isCenteredBoqColumn, isOutputDisclaimer, outputDisclaimerBody, OUTPUT_DISCLAIMER_GRAY, OUTPUT_POLICY_LABEL, OUTPUT_POLICY_URL } from "@/lib/outputDisclaimer";
import { REPORT_FOOTER_LINE, type PreparedReport, type ReportImage } from "@/lib/reportModel";

// pptxgenjs ships a CommonJS build whose default import is unreliable under Next.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PptxGenJS = require("pptxgenjs");

type Slide = {
  addImage: (opts: Record<string, unknown>) => void;
  addText: (text: unknown, opts: Record<string, unknown>) => void;
  addTable: (rows: unknown[], opts: Record<string, unknown>) => void;
  addShape: (shape: string, opts: Record<string, unknown>) => void;
};

const W = 13.333;
const H = 7.5;

function logoData(report: PreparedReport) {
  return `data:image/png;base64,${Buffer.from(report.logo).toString("base64")}`;
}

function wordmarkData(report: PreparedReport) {
  return `data:image/png;base64,${Buffer.from(report.wordmark).toString("base64")}`;
}

function wordmarkSize(report: PreparedReport, widthIn: number) {
  const { width, height } = pngSize(report.wordmark);
  return { w: widthIn, h: widthIn * (height / width) };
}

function pngData(image: ReportImage) {
  return `data:image/png;base64,${Buffer.from(image.png).toString("base64")}`;
}

function isWorkingHeader(header: string): boolean {
  const name = plainInline(header).trim();
  return name === "طريقة الحساب" || /^working$/i.test(name);
}

function columnWidths(headers: string[], total: number): number[] {
  const weight = (header: string) => {
    const name = plainInline(header).trim().toLowerCase();
    if (/^(item|البند)$/.test(name)) return 0.7;
    if (/^(unit|الوحدة)$/.test(name)) return 0.75;
    if (/^(quantity|qty|الكمية)$/.test(name)) return 0.95;
    if (/working|طريقة/.test(name)) return 2.3;
    if (/^(description|الوصف)$/.test(name)) return 1.7;
    return 1.15;
  };
  const weights = headers.map(weight);
  const sum = weights.reduce((totalWeight, value) => totalWeight + value, 0) || 1;
  return weights.map((value) => (value / sum) * total);
}

function rowBox(cells: string[], colW: number[], fontSize: number): number {
  const lines = Math.max(
    1,
    ...cells.map((cell, index) => {
      const cpl = Math.max(4, Math.floor(((Math.max(0.4, colW[index] - 0.2) * 72 * 2.3) / fontSize)));
      return plainInline(cell)
        .split("\n")
        .reduce((total, part) => {
          const arabic = part.match(/[\u0600-\u06FF]/g)?.length ?? 0;
          return total + Math.max(1, Math.ceil((part.length + arabic * 0.7) / cpl));
        }, 0);
    })
  );
  return lines * ((fontSize * 1.67) / 100) + 0.16;
}

export async function buildReportPptx(report: PreparedReport): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: W, height: H });
  pptx.layout = "WIDE";
  pptx.author = "engineerit.ai";
  pptx.title = report.title;
  pptx.subject = report.subtitle;
  pptx.rtlMode = report.locale === "ar";
  const rtl = report.locale === "ar";
  const face = rtl ? "Arial" : "Calibri";
  const lang = rtl ? "ar-SA" : "en-US";
  const slides: Slide[] = [];

  const add = () => {
    const slide = pptx.addSlide() as Slide;
    slides.push(slide);
    return slide;
  };

  const footer = (slide: Slide, page: number, total: number) => {
    const icon = 0.24;
    const label = rtl ? `شريحة ${page} من ${total}` : `Slide ${page} of ${total}`;
    const gray = OUTPUT_DISCLAIMER_GRAY.slice(1);
    const disclaimerRuns = directionalRuns(`${outputDisclaimerBody(report.locale)} `);
    slide.addText(
      [
        ...disclaimerRuns.map((run) => ({
          text: run.text,
          options: {
            color: gray,
            rtlMode: run.rtl,
            align: rtl ? "right" : "left",
            lang: run.rtl ? "ar-SA" : "en-US",
            fontFace: run.rtl ? "Arial" : "Calibri",
          },
        })),
        {
          text: OUTPUT_POLICY_LABEL,
          options: {
            color: gray,
            underline: { style: "sng", color: gray },
            hyperlink: { url: OUTPUT_POLICY_URL[report.locale] },
            rtlMode: false,
            align: rtl ? "right" : "left",
            lang: "en-US",
            fontFace: "Calibri",
          },
        },
      ],
      {
        x: 0.38,
        y: 6.55,
        w: W - 0.76,
        h: 0.46,
        fontFace: rtl ? "Arial" : face,
        lang: rtl ? "ar-SA" : "en-US",
        fontSize: 8,
        color: gray,
        align: rtl ? "right" : "left",
        valign: "top",
        rtlMode: rtl,
      }
    );
    if (rtl) {
      slide.addImage({ data: logoData(report), x: W - 0.38 - icon, y: 7.1, w: icon, h: icon });
      slide.addText(REPORT_FOOTER_LINE, {
        x: 4.4,
        y: 7.08,
        w: W - 0.38 - icon - 0.1 - 4.4,
        h: 0.28,
        fontFace: "Calibri",
        lang: "en-US",
        fontSize: 12,
        color: "64748B",
        align: "right",
        rtlMode: false,
      });
      slide.addText(label, {
        x: 0.35,
        y: 7.08,
        w: 3.7,
        h: 0.28,
        fontFace: face, lang,
        fontSize: 12,
        color: "64748B",
        align: "left",
        rtlMode: true,
      });
      return;
    }
    slide.addImage({ data: logoData(report), x: 0.38, y: 7.1, w: icon, h: icon });
    slide.addText(REPORT_FOOTER_LINE, {
      x: 0.38 + icon + 0.08,
      y: 7.08,
      w: 7.4,
      h: 0.28,
      fontFace: face, lang,
      fontSize: 12,
      color: "64748B",
      align: "left",
    });
    slide.addText(label, {
      x: 9.5,
      y: 7.08,
      w: 3.45,
      h: 0.28,
      fontFace: face, lang,
      fontSize: 12,
      color: "64748B",
      align: "right",
    });
  };

  const cover = add();
  const mark = wordmarkSize(report, 400 / 72);
  cover.addImage({ data: wordmarkData(report), x: (W - mark.w) / 2, y: 0.82, w: mark.w, h: mark.h });
  cover.addText(report.title, {
    x: 0.8,
    y: 2.3,
    w: W - 1.6,
    h: 1.4,
    fontFace: face, lang,
    fontSize: 36,
    bold: true,
    color: "0F172A",
    align: "center",
    rtlMode: blockDir(report.title, report.locale) === "rtl",
  });
  const subtitleRtl = directionalRuns(report.subtitle).some((run) => run.rtl);
  cover.addText(report.subtitle, {
    x: 1.2,
    y: 3.8,
    w: W - 2.4,
    h: 0.4,
    fontFace: subtitleRtl ? "Arial" : face,
    lang: subtitleRtl ? "ar-SA" : "en-US",
    fontSize: 16,
    color: "64748B",
    align: "center",
    rtlMode: subtitleRtl,
  });
  cover.addShape(pptx.ShapeType.rect, {
    x: (W - 2.2) / 2,
    y: 4.4,
    w: 2.2,
    h: 0.06,
    fill: { color: "1A56FF" },
    line: { color: "1A56FF" },
  });
  cover.addText(report.stamp, {
    x: 1.2,
    y: 4.6,
    w: W - 2.4,
    h: 0.35,
    fontFace: face, lang,
    fontSize: 14,
    color: "1A56FF",
    align: "center",
    rtlMode: rtl,
  });

  const contentSlide = (title: string) => {
    const slide = add();
    const icon = 0.28;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: W,
      h: 0.08,
      fill: { color: "1A56FF" },
      line: { color: "1A56FF" },
    });
    slide.addImage({ data: logoData(report), x: 0.42, y: 0.26, w: icon, h: icon });
    const titleRtl = rtl || blockDir(title, report.locale) === "rtl";
    slide.addText(title, {
      x: 0.42 + icon + 0.12,
      y: 0.2,
      w: W - 0.84 - icon - 0.12,
      h: 0.42,
      fontFace: face, lang,
      fontSize: 20,
      bold: true,
      color: "0F172A",
      align: "right",
      rtlMode: titleRtl,
    });
    return slide;
  };

  let body: string[] = [];
  let bodyTitle = report.title;
  let preface = "";
  const nextBlock = (start: number) => {
    for (let index = start; index < report.blocks.length; index += 1) {
      const block = report.blocks[index];
      if (block.type === "paragraph" && isOutputDisclaimer(plainInline(block.text), report.locale)) continue;
      return block;
    }
    return null;
  };
  const flushBody = () => {
    const text = body.join("\n").trim();
    body = [];
    if (!text) return;
    const chunks: string[] = [];
    let buf = "";
    for (const line of text.split("\n")) {
      const next = buf ? `${buf}\n${line}` : line;
      if (next.length > 700) {
        if (buf) chunks.push(buf);
        buf = line;
      } else buf = next;
    }
    if (buf) chunks.push(buf);
    for (const chunk of chunks) {
      const slide = contentSlide(bodyTitle);
      slide.addText(chunk, {
        x: 0.55,
        y: 0.85,
        w: W - 1.1,
        h: 5.5,
        fontFace: face, lang,
        fontSize: 18,
        color: "0F172A",
        align: rtl ? "right" : "left",
        valign: "top",
        rtlMode: rtl,
      });
    }
  };

  for (let index = 0; index < report.blocks.length; index += 1) {
    const block = report.blocks[index];
    if (block.type === "heading") {
      const introducesTable = nextBlock(index + 1)?.type === "table";
      const pending = body.join("\n").trim();
      if (introducesTable && pending.length > 0 && pending.length <= 220) {
        body = [];
        preface = pending;
      } else {
        flushBody();
      }
      bodyTitle = block.text;
      continue;
    }
    if (block.type === "paragraph") {
      if (isOutputDisclaimer(plainInline(block.text), report.locale)) continue;
      body.push(plainInline(block.text));
      body.push("");
      continue;
    }
    if (block.type === "list") {
      const pushItems = (items: typeof block.items, ordered: boolean, depth: number) => {
        items.forEach((item, index) => {
          body.push(`${"  ".repeat(depth)}${ordered ? `${index + 1}.` : "•"} ${plainInline(item.text)}`);
          if (item.children.length) pushItems(item.children, item.orderedChildren, depth + 1);
        });
      };
      pushItems(block.items, block.ordered, 0);
      body.push("");
      continue;
    }
    if (block.type === "chart" || block.type === "diagram") {
      flushBody();
      const image = report.images.get(block.index);
      if (!image) continue;
      const caption = block.type === "chart" ? block.model.title : rtl ? "مخطط" : "Diagram";
      const slide = contentSlide(caption);
      const maxW = W - 1.1;
      const maxH = 5.5;
      const scale = Math.min(maxW / image.width, maxH / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      slide.addImage({ data: pngData(image), x: (W - w) / 2, y: 0.8, w, h });
      continue;
    }
    if (block.type === "table") {
      flushBody();
      const tableRtl = rtl || block.headers.some((header) => /[\u0600-\u06FF]/.test(header));
      const tableW = W - 0.9;
      const fontSize = block.headers.length >= 7 ? 11 : 12;
      const sourceWidths = columnWidths(block.headers, tableW);
      const sourceHeaders = block.headers.map((header) => plainInline(header));
      const sourceRows = block.rows.map((row) => block.headers.map((_, cell) => plainInline(row[cell] ?? "")));
      const order = tableRtl ? sourceHeaders.map((_, index) => sourceHeaders.length - 1 - index) : sourceHeaders.map((_, index) => index);
      const colW = order.map((index) => sourceWidths[index]);
      const headerCells = order.map((index) => sourceHeaders[index]);
      const bodyRows = sourceRows.map((row) => order.map((index) => row[index] ?? ""));
      const workingSource = sourceHeaders.findIndex((header) => isWorkingHeader(header));
      const centered = sourceHeaders.map((header) => isCenteredBoqColumn(header));
      const cell = (text: string, header: boolean, fill: string, formula: boolean, center: boolean) => ({
        text,
        options: {
          fill: { color: fill },
          color: header ? "1E3A8A" : "0F172A",
          bold: header,
          align: center ? "center" : tableRtl ? "right" : "left",
          rtlMode: formula ? false : tableRtl,
        },
      });
      let cursor = 0;
      let firstSlide = true;
      do {
        const slide = contentSlide(bodyTitle);
        const tableY = firstSlide && preface ? 1.22 : 0.85;
        if (firstSlide && preface) {
          const prefaceRtl = blockDir(preface, report.locale) === "rtl";
          slide.addText(preface, {
            x: 0.5,
            y: 0.72,
            w: W - 1,
            h: 0.42,
            fontFace: face, lang,
            fontSize: 13,
            color: "334155",
            align: prefaceRtl ? "right" : "left",
            valign: "top",
            rtlMode: prefaceRtl,
          });
          preface = "";
        }
        const limit = 6.4 - tableY;
        let used = rowBox(headerCells, colW, fontSize);
        let end = cursor;
        while (end < bodyRows.length) {
          const next = rowBox(bodyRows[end], colW, fontSize);
          if (end > cursor && used + next > limit) break;
          used += next;
          end += 1;
          if (used > limit) break;
        }
        if (end === cursor && cursor < bodyRows.length) end = cursor + 1;
        const rows = [
          headerCells.map((text, displayIndex) => cell(text, true, "E7EEFF", false, centered[order[displayIndex]])),
          ...bodyRows.slice(cursor, end).map((row, index) =>
            row.map((text, displayIndex) =>
              cell(
                text,
                false,
                (cursor + index) % 2 ? "F8FAFC" : "FFFFFF",
                tableRtl && order[displayIndex] === workingSource,
                centered[order[displayIndex]]
              )
            )
          ),
        ];
        slide.addTable(rows, {
          x: 0.45,
          y: tableY,
          w: tableW,
          colW,
          border: [
            { pt: 0.5, color: "D0D7E2" },
            { pt: 0.5, color: "D0D7E2" },
            { pt: 0.5, color: "D0D7E2" },
            { pt: 0.5, color: "D0D7E2" },
          ],
          fontFace: face, lang,
          fontSize,
          valign: "middle",
          rtlMode: tableRtl,
          autoPage: false,
        });
        cursor = end;
        firstSlide = false;
      } while (cursor < bodyRows.length);
    }
  }
  flushBody();
  const total = slides.length;
  slides.forEach((slide, index) => footer(slide, index + 1, total));

  const buffer: Buffer = await pptx.write("nodebuffer");
  return new Uint8Array(buffer);
}
