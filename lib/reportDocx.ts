import JSZip from "jszip";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TableLayoutType,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
  ExternalHyperlink,
} from "docx";
import { directionalRuns } from "@/lib/arabicShape";
import { blockDir, plainInline, type Block } from "@/lib/messageDocument";
import { pngSize } from "@/lib/rasterSvg";
import { isOutputDisclaimer, outputDisclaimerBody, OUTPUT_DISCLAIMER_GRAY, OUTPUT_POLICY_LABEL, OUTPUT_POLICY_URL } from "@/lib/outputDisclaimer";
import { REPORT_FOOTER_LINE, type PreparedReport, type ReportImage } from "@/lib/reportModel";

const border = { style: BorderStyle.SINGLE, size: 4, color: "D0D7E2" };
const borders = { top: border, bottom: border, left: border, right: border };

function runFont(rtl: boolean) {
  const name = rtl ? "Arial" : "Calibri";
  return { ascii: name, hAnsi: name, cs: name, eastAsia: name };
}

function textRun(value: string, opts: { bold?: boolean; size?: number; color?: string; rtl: boolean; underline?: boolean }) {
  const size = opts.size ?? 22;
  return new TextRun({
    text: value || " ",
    bold: opts.bold,
    boldComplexScript: opts.bold,
    size,
    sizeComplexScript: size,
    font: runFont(opts.rtl),
    rightToLeft: opts.rtl,
    color: opts.color,
    underline: opts.underline ? { type: UnderlineType.SINGLE, color: opts.color } : undefined,
    language: opts.rtl ? { value: "ar-SA", bidirectional: "ar-SA" } : { value: "en-US" },
  });
}

function subtitleParagraph(value: string) {
  const runs = directionalRuns(plainInline(value));
  const rtl = runs.some((run) => run.rtl);
  return new Paragraph({
    bidirectional: rtl,
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: runs.map((run) => textRun(run.text, { rtl: run.rtl, size: 22 })),
  });
}

function paragraph(
  value: string,
  rtl: boolean,
  align?: (typeof AlignmentType)[keyof typeof AlignmentType],
  opts?: {
    bold?: boolean;
    size?: number;
    color?: string;
    spacing?: { before?: number; after?: number };
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
  }
) {
  const runs = directionalRuns(plainInline(value));
  const paragraphRtl = rtl || runs.some((run) => run.rtl);
  return new Paragraph({
    heading: opts?.heading,
    bidirectional: paragraphRtl,
    alignment: align ?? (paragraphRtl ? AlignmentType.START : AlignmentType.LEFT),
    spacing: opts?.spacing ?? { after: 80 },
    children: runs.map((run) =>
      textRun(run.text, {
        rtl: run.rtl,
        bold: opts?.bold,
        size: opts?.size ?? 22,
        color: opts?.color,
      })
    ),
  });
}

function imageRun(image: ReportImage, width: number) {
  const height = Math.max(48, Math.round(image.height * (width / image.width)));
  return new ImageRun({
    type: "png",
    data: image.png,
    transformation: { width, height },
    altText: { title: "Chart", description: "Chart", name: "chart" },
  });
}

const noEdge = { style: BorderStyle.NONE, size: 0, color: "auto" };
const clearBorders = {
  top: noEdge,
  bottom: noEdge,
  left: noEdge,
  right: noEdge,
  insideHorizontal: noEdge,
  insideVertical: noEdge,
};

function contentDxa(landscape: boolean) {
  // docx default page is A4 (11906 x 16838 DXA) and sections use 720 DXA side margins.
  const page = landscape ? 16838 : 11906;
  return page - 720 - 720;
}

function eitRun(logo: Uint8Array, px: number) {
  return new ImageRun({
    type: "png",
    data: logo,
    transformation: { width: px, height: px },
    altText: { title: "eit", description: "engineer it", name: "eit" },
  });
}

function chromeTable(total: number, widths: number[], edge: "top" | "bottom", rule: { style: (typeof BorderStyle)[keyof typeof BorderStyle]; size: number; color: string; space: number }, paragraphs: Paragraph[]) {
  const cellBorders = {
    top: edge === "top" ? rule : noEdge,
    bottom: edge === "bottom" ? rule : noEdge,
    left: noEdge,
    right: noEdge,
  };
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: clearBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        children: widths.map(
          (width, index) =>
            new TableCell({
              borders: cellBorders,
              width: { size: width, type: WidthType.DXA },
              margins: { top: edge === "top" ? 80 : 40, bottom: edge === "bottom" ? 60 : 0, left: 0, right: 0 },
              verticalAlign: VerticalAlign.CENTER,
              children: [paragraphs[index]],
            })
        ),
      }),
    ],
  });
}

function makeHeader(title: string, rtl: boolean, logo: Uint8Array, landscape: boolean) {
  const total = contentDxa(landscape);
  const iconCol = 520;
  const titleCol = total - iconCol;
  const icon = new Paragraph({
    spacing: { before: 0, after: 0 },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    children: [eitRun(logo, 16)],
  });
  const heading = new Paragraph({
    bidirectional: rtl,
    spacing: { before: 0, after: 0 },
    alignment: rtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
    children: [textRun(title, { bold: true, size: 20, rtl, color: "0F172A" })],
  });
  const rule = { style: BorderStyle.SINGLE, size: 12, color: "1A56FF", space: 1 };
  // Keep the Arabic title in a left column so bidi alignment cannot slide it into the icon.
  if (rtl) {
    const titleWidth = Math.round(total * 0.62);
    const gap = new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun("")] });
    return new Header({
      children: [chromeTable(total, [titleWidth, total - titleWidth - iconCol, iconCol], "bottom", rule, [heading, gap, icon])],
    });
  }
  return new Header({
    children: [chromeTable(total, [iconCol, titleCol], "bottom", rule, [icon, heading])],
  });
}

function makeFooter(report: PreparedReport, landscape: boolean) {
  const rtl = report.locale === "ar";
  const total = contentDxa(landscape);
  const pageCol = 3200;
  const brandCol = total - pageCol;
  const pageLabel = rtl
    ? ["صفحة ", PageNumber.CURRENT, " من ", PageNumber.TOTAL_PAGES]
    : ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES];
  const brand = new Paragraph({
    spacing: { before: 0, after: 0 },
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    children: rtl
      ? [textRun(`${REPORT_FOOTER_LINE}  `, { size: 16, rtl: false, color: "64748B" }), eitRun(report.logo, 14)]
      : [eitRun(report.logo, 14), textRun(`  ${REPORT_FOOTER_LINE}`, { size: 16, rtl: false, color: "64748B" })],
  });
  const pages = new Paragraph({
    bidirectional: rtl,
    spacing: { before: 0, after: 0 },
    alignment: rtl ? AlignmentType.LEFT : AlignmentType.RIGHT,
    children: [
      new TextRun({
        children: pageLabel,
        font: runFont(rtl),
        size: 16,
        sizeComplexScript: 16,
        color: "64748B",
        rightToLeft: rtl,
        language: rtl ? { value: "ar-SA", bidirectional: "ar-SA" } : { value: "en-US" },
      }),
    ],
  });
  const rule = { style: BorderStyle.SINGLE, size: 6, color: "D0D7E2", space: 1 };
  const gray = OUTPUT_DISCLAIMER_GRAY.slice(1);
  const noteRuns = directionalRuns(outputDisclaimerBody(report.locale));
  const link = new ExternalHyperlink({
    link: OUTPUT_POLICY_URL[report.locale],
    children: [
      textRun(OUTPUT_POLICY_LABEL, {
        rtl: false,
        size: 14,
        color: gray,
        underline: true,
      }),
    ],
  });
  const note = new Paragraph({
    bidirectional: rtl,
    alignment: rtl ? AlignmentType.START : AlignmentType.LEFT,
    spacing: { before: 0, after: 60 },
    children: [
      ...noteRuns.map((run) => textRun(run.rtl ? `${run.text} ` : run.text, { rtl: run.rtl, size: 14, color: gray })),
      link,
    ],
  });
  return new Footer({
    children: [
      note,
      chromeTable(total, rtl ? [pageCol, brandCol] : [brandCol, pageCol], "top", rule, rtl ? [pages, brand] : [brand, pages]),
    ],
  });
}

function tableFrom(headers: string[], rows: string[][], rtl: boolean, landscape: boolean) {
  const total = landscape ? 13900 : 9026;
  const columnWidths = headers.map(() => Math.floor(total / headers.length));
  const cell = (value: string, header: boolean, zebra: boolean) =>
    new TableCell({
      borders,
      width: { size: columnWidths[0], type: WidthType.DXA },
      shading: { fill: header ? "E7EEFF" : zebra ? "F8FAFC" : "FFFFFF" },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        paragraph(value, rtl, rtl ? AlignmentType.START : AlignmentType.LEFT, {
          bold: header,
          size: 18,
          color: header ? "1E3A8A" : "0F172A",
          spacing: { before: 0, after: 0 },
        }),
      ],
    });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths,
    visuallyRightToLeft: rtl,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((header) => cell(header, true, false)),
      }),
      ...rows.map(
        (row, index) =>
          new TableRow({
            cantSplit: true,
            children: headers.map((_, cellIndex) => cell(row[cellIndex] ?? "", false, index % 2 === 1)),
          })
      ),
    ],
  });
}

type Child = Paragraph | Table;
type Bucket = { landscape: boolean; cover: boolean; children: Child[] };

export async function buildReportDocx(report: PreparedReport): Promise<Uint8Array> {
  const rtlDoc = report.locale === "ar";
  const buckets: Bucket[] = [];
  const mark = pngSize(report.wordmark);
  const markW = (400 * 96) / 72;
  const markH = markW * (mark.height / mark.width);
  const cover: Child[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 200 },
      children: [
        new ImageRun({
          type: "png",
          data: report.wordmark,
          transformation: { width: markW, height: markH },
          altText: { title: "engineer it", description: "engineer it", name: "engineerit-wordmark" },
        }),
      ],
    }),
    paragraph(report.title, blockDir(report.title, report.locale) === "rtl", AlignmentType.CENTER, {
      bold: true,
      size: 56,
      spacing: { before: 400, after: 160 },
      heading: HeadingLevel.TITLE,
    }),
    subtitleParagraph(report.subtitle),
    paragraph(report.stamp, rtlDoc, AlignmentType.CENTER),
  ];
  buckets.push({ landscape: false, cover: true, children: cover });

  let current: Bucket = { landscape: false, cover: false, children: [] };
  const useBucket = (landscape: boolean) => {
    if (current.children.length && current.landscape !== landscape) {
      buckets.push(current);
      current = { landscape, cover: false, children: [] };
    }
    current.landscape = landscape;
  };

  const pushBlock = (block: Block) => {
    if (block.type === "heading") {
      useBucket(false);
      const rtl = blockDir(block.text, report.locale) === "rtl";
      const headings = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
      const heading = headings[block.level - 1] || HeadingLevel.HEADING_3;
      const size = block.level === 1 ? 32 : block.level === 2 ? 28 : block.level === 3 ? 24 : 22;
      current.children.push(paragraph(block.text, rtl, rtl ? AlignmentType.START : AlignmentType.LEFT, {
        bold: true,
        size,
        color: "1A56FF",
        spacing: { before: 280, after: 80 },
        heading,
      }));
      return;
    }
    if (block.type === "paragraph") {
      if (isOutputDisclaimer(plainInline(block.text), report.locale)) return;
      useBucket(false);
      current.children.push(paragraph(block.text, blockDir(block.text, report.locale) === "rtl"));
      return;
    }
    if (block.type === "list") {
      useBucket(false);
      const pushItems = (items: typeof block.items, ordered: boolean, depth: number) => {
        items.forEach((item, index) => {
          const rtl = blockDir(item.text, report.locale) === "rtl";
          const marker = ordered ? `${index + 1}. ` : "• ";
          const pad = "  ".repeat(depth);
          current.children.push(paragraph(`${pad}${marker}${item.text}`, rtl));
          if (item.children.length) pushItems(item.children, item.orderedChildren, depth + 1);
        });
      };
      pushItems(block.items, block.ordered, 0);
      return;
    }
    if (block.type === "table") {
      const rtl = rtlDoc || block.headers.some((header) => /[\u0600-\u06FF]/.test(header));
      const landscape = block.headers.length >= 7;
      useBucket(landscape);
      current.children.push(tableFrom(block.headers, block.rows, rtl, landscape));
      current.children.push(new Paragraph({ text: "" }));
      return;
    }
    if (block.type === "chart" || block.type === "diagram") {
      const image = report.images.get(block.index);
      if (!image) return;
      useBucket(true);
      const caption = block.type === "chart" ? block.model.title : report.locale === "ar" ? "مخطط" : "Diagram";
      current.children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 }, children: [imageRun(image, 900)] }));
      current.children.push(paragraph(caption, blockDir(caption, report.locale) === "rtl", AlignmentType.CENTER));
    }
  };

  for (const block of report.blocks) pushBlock(block);
  if (current.children.length) buckets.push(current);

  const doc = new Document({
    title: report.title,
    subject: report.subtitle,
    creator: "engineerit.ai",
    styles: {
      default: {
        document: { run: { font: rtlDoc ? "Arial" : "Calibri", size: 22 } },
      },
    },
    sections: buckets.map((bucket) => ({
      properties: {
        page: {
          size: {
            orientation: bucket.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
          margin: { top: 900, bottom: 1500, left: 720, right: 720, header: 400, footer: 280 },
        },
      },
      headers: bucket.cover ? undefined : { default: makeHeader(report.title, rtlDoc, report.logo, bucket.landscape) },
      footers: { default: makeFooter(report, bucket.landscape) },
      children: bucket.children,
    })),
  });
  const buffer = await Packer.toBuffer(doc);
  if (!rtlDoc) return new Uint8Array(buffer);
  const zip = await JSZip.loadAsync(buffer);
  const settings = await zip.file("word/settings.xml")!.async("string");
  if (!settings.includes("w:themeFontLang")) {
    zip.file(
      "word/settings.xml",
      settings.replace("</w:settings>", '<w:themeFontLang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/></w:settings>')
    );
  }
  const marked = await zip.generateAsync({ type: "nodebuffer" });
  return new Uint8Array(marked);
}
