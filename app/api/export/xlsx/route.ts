import { NextResponse } from "next/server";
import { contentDisposition, shortTopic } from "@/lib/exportName";
import { exportLocale, guardExport } from "@/lib/exportQuotaGate";
import { riyadhStamp } from "@/lib/ksaTime";
import { prepareReport } from "@/lib/reportModel";
import { buildReportXlsx, buildTableXlsx } from "@/lib/reportXlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let release = async () => {};
  try {
    const body = (await req.json()) as {
      title?: string;
      content?: string;
      text?: string;
      locale?: string;
      headers?: string[];
      rows?: string[][];
      stamp?: string;
      filename?: string;
    };
    const locale = body.locale === "ar" ? "ar" : "en";
    const gate = await guardExport(req, exportLocale(req, locale));
    if (!gate.ok) return gate.response;
    release = gate.release;
    const bytes =
      body.headers && body.rows
        ? await buildTableXlsx({
            title: body.title || (locale === "ar" ? "جدول" : "Table"),
            stamp: body.stamp || riyadhStamp(new Date(), locale),
            locale,
            headers: body.headers,
            rows: body.rows,
          })
        : await buildReportXlsx(
            await prepareReport({
              title: body.title,
              markdown: (body.content ?? body.text ?? "").toString(),
              locale,
            })
          );
    const topic = shortTopic(body.title, locale === "ar" ? "جدول" : "Table");
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDisposition(topic, "xlsx"),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    await release();
    console.error("XLSX export error:", err);
    return NextResponse.json({ error: "Failed to generate Excel." }, { status: 500 });
  }
}
