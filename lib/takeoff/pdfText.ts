import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type PdfTextEngine = "auto" | "unpdf" | "pdftotext";

/**
 * unpdf's PDF.js bundle reads `Iterator.prototype.join` while the module
 * evaluates. Node 20 has no global Iterator (it arrived in Node 22), so that
 * read throws ReferenceError and the text layer is discarded. The bundle only
 * assigns `join` when it is missing; it does not call it. A stand-in class is
 * enough for the module to finish loading.
 */
function ensureIteratorGlobal(): void {
  const scope = globalThis as unknown as { Iterator?: unknown };
  if (typeof scope.Iterator === "undefined") {
    scope.Iterator = class Iterator {};
  }
}

async function extractWithUnpdf(buffer: Buffer): Promise<string> {
  ensureIteratorGlobal();
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });
  const text = result.text;
  if (Array.isArray(text)) return text.join("\n");
  return typeof text === "string" ? text : "";
}

async function extractWithPdftotext(buffer: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "takeoff-pdf-"));
  const file = join(dir, "drawing.pdf");
  try {
    await writeFile(file, buffer);
    const { stdout } = await exec("pdftotext", ["-layout", "-enc", "UTF-8", file, "-"], {
      timeout: 20000,
      maxBuffer: 4_000_000,
    });
    return stdout || "";
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Read the PDF text layer. PDF.js runs first so hosts without poppler
 * (including Node 20) still get the schedule. Poppler is the fallback when
 * that bundle cannot be loaded.
 */
export async function extractPdfText(buffer: Buffer, engine: PdfTextEngine = "auto"): Promise<string> {
  if (engine !== "pdftotext") {
    try {
      const text = await extractWithUnpdf(buffer);
      if (text.trim() || engine === "unpdf") return text;
    } catch (err) {
      if (engine === "unpdf") throw err;
      console.error("takeoff pdf.js text failed", err);
    }
  }
  try {
    return await extractWithPdftotext(buffer);
  } catch (err) {
    if (engine === "pdftotext") throw err;
    console.error("takeoff pdftotext failed", err);
    return "";
  }
}
