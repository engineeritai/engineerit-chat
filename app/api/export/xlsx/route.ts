import { NextResponse } from "next/server";
import { contentDisposition, shortTopic } from "@/lib/exportName";
import { formatCoverDate, formatCoverTime } from "@/lib/ksaTime";
import { resolveMessageTimeZone } from "@/lib/messageTime";
import { prepareReport } from "@/lib/reportModel";
import { buildReportXlsx, buildTableXlsx } from "@/lib/reportXlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
      timeZone?: string;
    };
    const locale = body.locale === "ar" ? "ar" : "en";
    const bytes =
      body.headers && body.rows
        ? await buildTableXlsx({
            title: body.title || (locale === "ar" ? "جدول" : "Table"),
            stamp:
              body.stamp ||
              `${formatCoverDate(new Date(), locale, resolveMessageTimeZone(body.timeZone))}, ${formatCoverTime(new Date(), locale, resolveMessageTimeZone(body.timeZone))}`,
            locale,
            headers: body.headers,
            rows: body.rows,
          })
        : await buildReportXlsx(
            await prepareReport({
              title: body.title,
              markdown: (body.content ?? body.text ?? "").toString(),
              locale,
              timeZone: body.timeZone,
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
    console.error("XLSX export error:", err);
    return NextResponse.json({ error: "Failed to generate Excel." }, { status: 500 });
  }
}
