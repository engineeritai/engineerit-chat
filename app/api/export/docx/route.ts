import { NextResponse } from "next/server";
import { contentDisposition } from "@/lib/exportName";
import { exportLocale, guardExport } from "@/lib/exportQuotaGate";
import { buildReportDocx } from "@/lib/reportDocx";
import { prepareReport } from "@/lib/reportModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let release = async () => {};
  try {
    const body = (await req.json()) as {
      text?: string;
      content?: string;
      title?: string;
      subtitle?: string;
      filename?: string;
      locale?: string;
      diagrams?: { index: number; pngBase64: string }[];
    };
    const markdown = (body.content ?? body.text ?? "").toString();
    if (!markdown.trim()) return NextResponse.json({ error: "Missing content." }, { status: 400 });
    const gate = await guardExport(req, exportLocale(req, body.locale));
    if (!gate.ok) return gate.response;
    release = gate.release;
    const report = await prepareReport({
      title: body.title,
      subtitle: body.subtitle,
      markdown,
      locale: body.locale,
      diagrams: body.diagrams,
    });
    const bytes = await buildReportDocx(report);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": contentDisposition(report.title, "docx"),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    await release();
    console.error("DOCX export error:", err);
    return new NextResponse("DOCX export failed.", { status: 500 });
  }
}
