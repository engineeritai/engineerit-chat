import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/lib/i18n";
import { historyCode, isUuid, requireHistoryUser } from "@/lib/historyAccess";
import { canExportChatHistory } from "@/lib/historyRetention";
import { getVisibleConversation, listMessages, summaryFor } from "@/lib/historyDb";
import { buildChatDocx, buildChatPdf, exportFilename } from "@/lib/chatExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function localeFrom(request: Request): Locale {
  const header = request.headers.get("x-locale");
  if (isLocale(header)) return header;
  const param = new URL(request.url).searchParams.get("locale");
  return isLocale(param) ? param : "en";
}

export async function GET(request: Request, context: RouteContext) {
  const gate = await requireHistoryUser(request);
  if (!gate.ok) return gate.response;
  if (!canExportChatHistory(gate.account.rawTier)) return historyCode(403, "export_locked");

  const { id } = await context.params;
  if (!isUuid(id)) return historyCode(400, "invalid");
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "pdf" && format !== "docx") return historyCode(400, "invalid");

  try {
    const row = await getVisibleConversation(id, gate.account);
    const summary = row ? summaryFor(row, gate.account) : null;
    if (!row || !summary) return historyCode(404, "not_found");
    const messages = await listMessages(row.id);
    const locale = localeFrom(request);
    const bytes =
      format === "pdf"
        ? await buildChatPdf({ title: summary.title, messages, locale })
        : await buildChatDocx({ title: summary.title, messages, locale });
    const body = new Uint8Array(bytes);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": exportFilename(summary.title, format),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("history export failed", err);
    return historyCode(500, "failed");
  }
}
