import { NextResponse } from "next/server";
import { contentDisposition } from "@/lib/exportName";
import { buildReportPdf } from "@/lib/reportPdf";
import { prepareReport } from "@/lib/reportModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      subtitle?: string;
      content?: string;
      text?: string;
      filename?: string;
      locale?: string;
      diagrams?: { index: number; pngBase64: string }[];
    };
    const markdown = (body.content ?? body.text ?? "").toString();
    if (!markdown.trim()) return NextResponse.json({ error: "Missing content." }, { status: 400 });
    const report = await prepareReport({
      title: body.title,
      subtitle: body.subtitle,
      markdown,
      locale: body.locale,
      diagrams: body.diagrams,
    });
    const bytes = await buildReportPdf(report);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(report.title, "pdf"),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF export error:", err);
    return new NextResponse("PDF export failed.", { status: 500 });
  }
}
