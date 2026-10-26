import { NextResponse } from "next/server";
import { contentDisposition } from "@/lib/exportName";
import { checkExportQuota, exportLocale } from "@/lib/exportQuota";
import { buildReportPptx } from "@/lib/reportPptx";
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
    const denied = await checkExportQuota(req, exportLocale(req, body.locale));
    if (denied) return denied;
    const report = await prepareReport({
      title: body.title,
      subtitle: body.subtitle,
      markdown,
      locale: body.locale,
      diagrams: body.diagrams,
    });
    const bytes = await buildReportPptx(report);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": contentDisposition(report.title, "pptx"),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PPTX export error:", err);
    return NextResponse.json({ error: "Failed to generate PPTX." }, { status: 500 });
  }
}
