import { blockDir, plainInline } from "@/lib/messageDocument";
import type { PreparedReport, ReportImage } from "@/lib/reportModel";

// pptxgenjs ships a CommonJS build whose default import is unreliable under Next.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PptxGenJS = require("pptxgenjs");

type Slide = {
  addImage: (opts: Record<string, unknown>) => void;
  addText: (text: string, opts: Record<string, unknown>) => void;
  addTable: (rows: unknown[], opts: Record<string, unknown>) => void;
  addShape: (shape: string, opts: Record<string, unknown>) => void;
};

const W = 13.333;
const H = 7.5;

function logoData(report: PreparedReport) {
  return `data:image/png;base64,${Buffer.from(report.logo).toString("base64")}`;
}

function pngData(image: ReportImage) {
  return `data:image/png;base64,${Buffer.from(image.png).toString("base64")}`;
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
    slide.addImage({ data: logoData(report), x: rtl ? W - 0.62 : 0.38, y: 7.08, w: 0.26, h: 0.26 });
    slide.addText("engineer it · engineerit.ai", {
      x: rtl ? 7.2 : 0.72,
      y: 7.08,
      w: 3.6,
      h: 0.28,
      fontFace: face, lang,
      fontSize: 11,
      color: "64748B",
      align: rtl ? "right" : "left",
      rtlMode: rtl,
    });
    slide.addText(report.stamp, {
      x: 4.4,
      y: 7.08,
      w: 4.5,
      h: 0.28,
      fontFace: face, lang,
      fontSize: 11,
      color: "64748B",
      align: "center",
      rtlMode: rtl,
    });
    const label = rtl ? `شريحة ${page} من ${total}` : `Slide ${page} of ${total}`;
    slide.addText(label, {
      x: rtl ? 0.35 : 9.5,
      y: 7.08,
      w: 3.4,
      h: 0.28,
      fontFace: face, lang,
      fontSize: 11,
      color: "64748B",
      align: rtl ? "left" : "right",
      rtlMode: rtl,
    });
  };

  const cover = add();
  cover.addImage({ data: logoData(report), x: (W - 0.7) / 2, y: 1.35, w: 0.7, h: 0.7 });
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
  cover.addText(report.subtitle, {
    x: 1.2,
    y: 3.8,
    w: W - 2.4,
    h: 0.4,
    fontFace: face, lang,
    fontSize: 16,
    color: "64748B",
    align: "center",
    rtlMode: rtl,
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
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: W,
      h: 0.08,
      fill: { color: "1A56FF" },
      line: { color: "1A56FF" },
    });
    slide.addText(title, {
      x: 0.5,
      y: 0.22,
      w: W - 1,
      h: 0.42,
      fontFace: face, lang,
      fontSize: 20,
      bold: true,
      color: "0F172A",
      align: rtl ? "right" : "left",
      rtlMode: blockDir(title, report.locale) === "rtl",
    });
    return slide;
  };

  let body: string[] = [];
  let bodyTitle = report.title;
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
        h: 5.9,
        fontFace: face, lang,
        fontSize: 18,
        color: "0F172A",
        align: rtl ? "right" : "left",
        valign: "top",
        rtlMode: rtl,
      });
    }
  };

  for (const block of report.blocks) {
    if (block.type === "heading") {
      flushBody();
      bodyTitle = block.text;
      continue;
    }
    if (block.type === "paragraph") {
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
      const slide = contentSlide(bodyTitle);
      const tableRtl = rtl || block.headers.some((header) => /[\u0600-\u06FF]/.test(header));
      const head = block.headers.map((header) => ({
        text: plainInline(header),
        options: { fill: { color: "E7EEFF" }, color: "1E3A8A", bold: true, align: tableRtl ? "right" : "left" },
      }));
      const rows = [
        head,
        ...block.rows.map((row, index) =>
          block.headers.map((_, cell) => ({
            text: plainInline(row[cell] ?? ""),
            options: {
              fill: { color: index % 2 ? "F8FAFC" : "FFFFFF" },
              color: "0F172A",
              align: tableRtl ? "right" : "left",
            },
          }))
        ),
      ];
      slide.addTable(rows, {
        x: 0.45,
        y: 0.85,
        w: W - 0.9,
        h: 5.9,
        colW: block.headers.map(() => (W - 0.9) / block.headers.length),
        border: [
          { pt: 0.5, color: "D0D7E2" },
          { pt: 0.5, color: "D0D7E2" },
          { pt: 0.5, color: "D0D7E2" },
          { pt: 0.5, color: "D0D7E2" },
        ],
        fontFace: face, lang,
        fontSize: block.headers.length >= 7 ? 11 : 13,
        valign: "middle",
        rtlMode: tableRtl,
      });
    }
  }
  flushBody();
  const total = slides.length;
  slides.forEach((slide, index) => footer(slide, index + 1, total));

  const buffer: Buffer = await pptx.write("nodebuffer");
  return new Uint8Array(buffer);
}
