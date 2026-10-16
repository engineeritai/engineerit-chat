import { NextRequest, NextResponse } from "next/server";
import { gateAdvisor } from "@/lib/advisorGate";
import { IncomingFileError, createIncomingUpload } from "@/lib/incomingStorage";
import {
  MAX_UPLOAD_BYTES,
  directUploadFailedMessage,
  fileTooLargeMessage,
} from "@/lib/uploadLimits";

export const runtime = "nodejs";

/**
 * Mint a signed Storage upload for files that cannot fit in a Vercel request
 * body (~4.5 MB). The browser uploads the bytes, then asks /api/document or
 * /api/image to read the object and delete it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      filename?: unknown;
      size?: unknown;
      advisorId?: unknown;
      locale?: unknown;
      playbookId?: unknown;
    } | null;

    const filename = typeof body?.filename === "string" ? body.filename.trim() : "";
    const size = typeof body?.size === "number" ? body.size : Number.NaN;
    if (!filename || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: fileTooLargeMessage() }, { status: 413 });
    }

    const advisorGate = await gateAdvisor({
      request: req,
      advisorId: body?.advisorId,
      locale: body?.locale,
      playbookId: body?.playbookId,
    });
    if (advisorGate.active && !advisorGate.ok) return advisorGate.response;

    const signed = await createIncomingUpload(filename);
    return NextResponse.json(signed);
  } catch (err) {
    console.error("SIGNED UPLOAD ERROR:", err);
    if (err instanceof IncomingFileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: directUploadFailedMessage() }, { status: 500 });
  }
}
