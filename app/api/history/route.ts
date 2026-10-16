import { NextResponse } from "next/server";
import { historyCode, isUuid, requireHistoryUser } from "@/lib/historyAccess";
import { createConversation, listConversations, summaryFor } from "@/lib/historyDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireHistoryUser(request);
  if (!gate.ok) return gate.response;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const conversations = await listConversations(gate.account, query);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("history list failed", err);
    return historyCode(500, "failed");
  }
}

export async function POST(request: Request) {
  const gate = await requireHistoryUser(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    title?: unknown;
    discipline?: unknown;
  } | null;
  if (body?.id != null && !isUuid(body.id)) return historyCode(400, "invalid");
  try {
    const created = await createConversation({
      account: gate.account,
      id: isUuid(body?.id) ? body.id : undefined,
      title: String(body?.title ?? ""),
      discipline: body?.discipline == null ? null : String(body.discipline),
    });
    if (created.conflict) return historyCode(409, "invalid");
    const summary = summaryFor(created.row, gate.account);
    if (!summary) return historyCode(404, "not_found");
    return NextResponse.json({ conversation: summary });
  } catch (err) {
    console.error("history create failed", err);
    return historyCode(500, "failed");
  }
}
