import ExcelJS from "exceljs";
import { plainInline } from "@/lib/messageDocument";
import type { PreparedReport } from "@/lib/reportModel";

function styleHeader(cell: ExcelJS.Cell, rtl: boolean) {
  cell.font = { name: rtl ? "Arial" : "Calibri", bold: true, color: { argb: "FF1E3A8A" }, size: 12 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EEFF" } };
  cell.alignment = { horizontal: rtl ? "right" : "left", vertical: "middle", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FFD0D7E2" } },
    bottom: { style: "thin", color: { argb: "FFD0D7E2" } },
    left: { style: "thin", color: { argb: "FFD0D7E2" } },
    right: { style: "thin", color: { argb: "FFD0D7E2" } },
  };
}

function styleBody(cell: ExcelJS.Cell, rtl: boolean, zebra: boolean) {
  cell.font = { name: rtl ? "Arial" : "Calibri", size: 11, color: { argb: "FF0F172A" } };
  cell.alignment = { horizontal: rtl ? "right" : "left", vertical: "middle", wrapText: true };
  if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
}

function fitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let width = 14;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const length = String(cell.value ?? "").length + 2;
      if (length > width) width = Math.min(42, length);
    });
    column.width = width;
  });
}

function addTableSheet(book: ExcelJS.Workbook, name: string, title: string, stamp: string, headers: string[], rows: string[][], rtl: boolean) {
  const sheet = book.addWorksheet(name.slice(0, 31), {
    views: [{ rightToLeft: rtl, state: "frozen", ySplit: 4, showGridLines: false }],
  });
  const span = Math.max(headers.length, 1);
  sheet.mergeCells(1, 1, 1, span);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { name: rtl ? "Arial" : "Calibri", size: 18, bold: true, color: { argb: "FF1A56FF" } };
  sheet.getCell(1, 1).alignment = { horizontal: rtl ? "right" : "left" };
  sheet.mergeCells(2, 1, 2, span);
  sheet.getCell(2, 1).value = stamp;
  sheet.getCell(2, 1).font = { name: rtl ? "Arial" : "Calibri", size: 11, color: { argb: "FF64748B" } };
  sheet.getCell(2, 1).alignment = { horizontal: rtl ? "right" : "left" };
  headers.forEach((header, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = plainInline(header);
    styleHeader(cell, rtl);
  });
  rows.forEach((row, rowIndex) => {
    headers.forEach((_, cellIndex) => {
      const cell = sheet.getCell(5 + rowIndex, cellIndex + 1);
      cell.value = plainInline(row[cellIndex] ?? "");
      styleBody(cell, rtl, rowIndex % 2 === 1);
    });
  });
  sheet.getRow(4).height = 22;
  fitColumns(sheet);
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: Math.max(4, 4 + rows.length), column: span },
  };
}

export async function buildReportXlsx(report: PreparedReport): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  book.creator = "engineerit.ai";
  book.created = new Date();
  const rtl = report.locale === "ar";
  const tables = report.blocks.filter((block) => block.type === "table");
  if (!tables.length) {
    const lines = report.blocks
      .filter((block) => block.type === "heading" || block.type === "paragraph" || block.type === "list")
      .flatMap((block) => {
        if (block.type === "list") {
          const flat = (items: typeof block.items, depth = 0): string[][] =>
            items.flatMap((item) => [[`${"  ".repeat(depth)}${item.text}`], ...flat(item.children, depth + 1)]);
          return flat(block.items);
        }
        if (block.type === "heading" || block.type === "paragraph") return [[block.text]];
        return [];
      });
    addTableSheet(
      book,
      rtl ? "تقرير" : "Report",
      report.title,
      report.stamp,
      [rtl ? "المحتوى" : "Content"],
      lines,
      rtl
    );
  } else {
    tables.forEach((block, index) => {
      if (block.type !== "table") return;
      const name = index === 0 ? (rtl ? "تقرير" : "Report") : rtl ? `جدول ${index + 1}` : `Table ${index + 1}`;
      addTableSheet(book, name, report.title, report.stamp, block.headers, block.rows, rtl);
    });
  }
  const buffer = await book.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

export async function buildTableXlsx(args: {
  title: string;
  stamp: string;
  locale: "en" | "ar";
  headers: string[];
  rows: string[][];
}): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  book.creator = "engineerit.ai";
  addTableSheet(book, args.locale === "ar" ? "جدول" : "Table", args.title, args.stamp, args.headers, args.rows, args.locale === "ar");
  const buffer = await book.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
