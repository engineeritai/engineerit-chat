import JSZip from "jszip";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
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
    alignment: AlignmentType.LEFT,
    children: [eitRun(logo, 16)],
  });
  const titleRuns = directionalRuns(title);
  const heading = new Paragraph({
    bidirectional: rtl || titleRuns.some((run) => run.rtl),
    spacing: { before: 0, after: 0 },
    alignment: rtl ? AlignmentType.START : AlignmentType.RIGHT,
    children: titleRuns.map((run) => textRun(run.text, { bold: true, size: 20, rtl: run.rtl, color: "0F172A" })),
  });
  const rule = { style: BorderStyle.SINGLE, size: 12, color: "1A56FF", space: 1 };
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
    alignment: AlignmentType.LEFT,
    children: [eitRun(report.logo, 14), textRun(`  ${REPORT_FOOTER_LINE}`, { size: 16, rtl: false, color: "64748B" })],
  });
  const pageNumber = (which: (typeof PageNumber)[keyof typeof PageNumber]) =>
    new TextRun({
      children: [which],
      font: runFont(false),
      size: 16,
      sizeComplexScript: 16,
      color: "64748B",
      rightToLeft: false,
      language: { value: "en-US" },
    });
  const pages = new Paragraph({
    bidirectional: rtl,
    spacing: { before: 0, after: 0 },
    alignment: rtl ? AlignmentType.START : AlignmentType.RIGHT,
    children: rtl
      ? [
          textRun("صفحة ", { size: 16, rtl: true, color: "64748B" }),
          pageNumber(PageNumber.CURRENT),
          textRun(" من ", { size: 16, rtl: true, color: "64748B" }),
          pageNumber(PageNumber.TOTAL_PAGES),
        ]
      : [
          new TextRun({
            children: pageLabel,
            font: runFont(false),
            size: 16,
            sizeComplexScript: 16,
            color: "64748B",
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
      chromeTable(total, [brandCol, pageCol], "top", rule, [brand, pages]),
    ],
  });
}

function isWorkingHeader(header: string): boolean {
  const name = plainInline(header).trim();
  return name === "طريقة الحساب" || /^working$/i.test(name);
}

/** A working formula stays one left-to-right paragraph so digits are not reordered. */
function formulaParagraph(value: string) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 0 },
    children: [
      textRun(plainInline(value), {
        rtl: false,
        size: 18,
        color: "0F172A",
      }),
    ],
  });
}

function tableFrom(headers: string[], rows: string[][], rtl: boolean, landscape: boolean) {
  const total = landscape ? 13900 : 9026;
  const columnWidths = headers.map(() => Math.floor(total / headers.length));
  const workingIndex = headers.findIndex((header) => isWorkingHeader(header));
  const cell = (value: string, header: boolean, zebra: boolean, formula: boolean) =>
    new TableCell({
      borders,
      width: { size: columnWidths[0], type: WidthType.DXA },
      shading: { fill: header ? "E7EEFF" : zebra ? "F8FAFC" : "FFFFFF" },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        formula
          ? formulaParagraph(value)
          : paragraph(value, rtl, rtl ? AlignmentType.START : AlignmentType.LEFT, {
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
    alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    visuallyRightToLeft: rtl,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((header) => cell(header, true, false, false)),
      }),
      ...rows.map(
        (row, index) =>
          new TableRow({
            cantSplit: true,
            children: headers.map((_, cellIndex) =>
              cell(row[cellIndex] ?? "", false, index % 2 === 1, rtl && cellIndex === workingIndex)
            ),
          })
      ),
    ],
  });
}

const RTL_BULLETS = "rtl-bullets";
const RTL_NUMBERS = "rtl-numbers";

function rtlLevel(level: number, format: (typeof LevelFormat)[keyof typeof LevelFormat], text: string) {
  return {
    level,
    format,
    text,
    alignment: AlignmentType.RIGHT,
    style: {
      run: {
        font: runFont(true),
        rightToLeft: true,
        size: 22,
        sizeComplexScript: 22,
      },
      paragraph: { indent: { right: 720 + level * 360, hanging: 360 } },
    },
  };
}

function listParagraph(value: string, ordered: boolean, depth: number) {
  const runs = directionalRuns(plainInline(value));
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.START,
    numbering: { reference: ordered ? RTL_NUMBERS : RTL_BULLETS, level: Math.min(depth, 2) },
    spacing: { after: 80 },
    children: runs.map((run) => textRun(run.text, { rtl: run.rtl })),
  });
}

type Child = Paragraph | Table;
type Bucket = { landscape: boolean; cover: boolean; children: Child[] };

function withSectionBidi(xml: string): string {
  return xml.replace(/<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>/g, (block) =>
    /<w:bidi\/>|<w:bidi[\s/>]/.test(block) ? block : block.replace("</w:sectPr>", "<w:bidi/></w:sectPr>")
  );
}

function withNumberingBidi(xml: string): string {
  return xml.replace(/<w:lvl\b[\s\S]*?<\/w:lvl>/g, (level) => {
    if (!level.includes('w:val="bullet"') && !level.includes('w:val="decimal"')) return level;
    let next = level.includes("<w:bidi/>") ? level : level.replace("<w:pPr>", "<w:pPr><w:bidi/>");
    if (!next.includes("<w:pPr>")) next = next.replace("</w:lvl>", "<w:pPr><w:bidi/></w:pPr></w:lvl>");
    next = next.replace(/<w:lvlJc w:val="[^"]+"\/>/, '<w:lvlJc w:val="right"/>');
    next = next.replace(/<w:ind w:left="(\d+)" w:hanging="(\d+)"\/>/, '<w:ind w:right="$1" w:hanging="$2"/>');
    if (!/<w:rtl\/>|<w:rtl[\s/>]/.test(next)) {
      next = next.includes("<w:rPr>")
        ? next.replace("<w:rPr>", '<w:rPr><w:rtl/><w:szCs w:val="22"/>')
        : next.replace("</w:lvl>", '<w:rPr><w:rtl/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:szCs w:val="22"/></w:rPr></w:lvl>');
    }
    return next;
  });
}

function keepChromeTablesLogical(xml: string): string {
  return xml.replace(/<w:tblPr>/g, (open) => `${open}<w:bidiVisual w:val="0"/>`);
}

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
          const rtl = rtlDoc || blockDir(item.text, report.locale) === "rtl";
          if (rtl) current.children.push(listParagraph(item.text, ordered, depth));
          else {
            const marker = ordered ? `${index + 1}. ` : "• ";
            const pad = "  ".repeat(depth);
            current.children.push(paragraph(`${pad}${marker}${item.text}`, false));
          }
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
      current.children.push(new Paragraph({ bidirectional: rtl, text: "" }));
      return;
    }
    if (block.type === "chart" || block.type === "diagram") {
      const image = report.images.get(block.index);
      if (!image) return;
      useBucket(true);
      const caption = block.type === "chart" ? block.model.title : report.locale === "ar" ? "مخطط" : "Diagram";
      current.children.push(new Paragraph({ bidirectional: rtlDoc, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 }, children: [imageRun(image, 900)] }));
      current.children.push(paragraph(caption, blockDir(caption, report.locale) === "rtl", AlignmentType.CENTER));
    }
  };

  for (const block of report.blocks) pushBlock(block);
  if (current.children.length) buckets.push(current);

  const doc = new Document({
    title: report.title,
    subject: report.subtitle,
    creator: "engineerit.ai",
    numbering: rtlDoc
      ? {
          config: [
            {
              reference: RTL_BULLETS,
              levels: [0, 1, 2].map((level) => rtlLevel(level, LevelFormat.BULLET, "•")),
            },
            {
              reference: RTL_NUMBERS,
              levels: [0, 1, 2].map((level) => rtlLevel(level, LevelFormat.DECIMAL, `%${level + 1}.`)),
            },
          ],
        }
      : undefined,
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
  const documentXml = await zip.file("word/document.xml")!.async("string");
  zip.file("word/document.xml", withSectionBidi(documentXml));
  const numbering = zip.file("word/numbering.xml");
  if (numbering) zip.file("word/numbering.xml", withNumberingBidi(await numbering.async("string")));
  for (const name of Object.keys(zip.files)) {
    if (!/^word\/(header|footer)\d+\.xml$/.test(name)) continue;
    zip.file(name, keepChromeTablesLogical(await zip.file(name)!.async("string")));
  }
  const marked = await zip.generateAsync({ type: "nodebuffer" });
  return new Uint8Array(marked);
}
