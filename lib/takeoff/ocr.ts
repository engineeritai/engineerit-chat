import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

async function ocrWithBinary(buffer: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "takeoff-"));
  const image = join(dir, "drawing.png");
  try {
    await writeFile(image, buffer);
    const { stdout } = await exec("tesseract", [image, "stdout", "--psm", "6"], {
      timeout: 20000,
      maxBuffer: 2_000_000,
    });
    return stdout || "";
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

type OcrWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
};

let workerPromise: Promise<OcrWorker> | null = null;

async function ocrWithLibrary(buffer: Buffer): Promise<string> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng", 1, {
        cachePath: join(tmpdir(), "engineerit-tesseract"),
      });
    })();
  }
  try {
    const worker = await workerPromise;
    const result = await worker.recognize(buffer);
    return result.data.text || "";
  } catch (err) {
    workerPromise = null;
    throw err;
  }
}

/** Read the words on an engineering image. Prefers a local Tesseract binary. */
export async function ocrImage(buffer: Buffer): Promise<string> {
  try {
    const text = await ocrWithBinary(buffer);
    if (text.trim()) return text;
  } catch {
    // The binary is not on every host. The library is the fallback.
  }
  try {
    return await ocrWithLibrary(buffer);
  } catch (err) {
    console.error("takeoff ocr failed", err);
    return "";
  }
}
