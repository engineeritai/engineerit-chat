import { NextResponse } from "next/server";
import { historyCode, isUuid, requireHistoryUser } from "@/lib/historyAccess";
import {
  deleteConversation,
  getVisibleConversation,
  listMessages,
  summaryFor,
  updateConversation,
} from "@/lib/historyDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const gate = await requireHistoryUser(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  if (!isUuid(id)) return historyCode(400, "invalid");
  try {
    const row = await getVisibleConversation(id, gate.account);
    const summary = row ? summaryFor(row, gate.account) : null;
    if (!row || !summary) return historyCode(404, "not_found");
    const messages = await listMessages(row.id);
    return NextResponse.json({ conversation: summary, messages });
  } catch (err) {
    console.error("history read failed", err);
    return historyCode(500, "failed");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireHistoryUser(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  if (!isUuid(id)) return historyCode(400, "invalid");
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    discipline?: unknown;
    pinned?: unknown;
    sharedWithTeam?: unknown;
  } | null;
  if (!body) return historyCode(400, "invalid");
  try {
    const updated = await updateConversation({
      account: gate.account,
      id,
      title: body.title,
      discipline: body.discipline,
      pinned: body.pinned,
      sharedWithTeam: body.sharedWithTeam,
    });
    if (updated.status === "missing") return historyCode(404, "not_found");
    if (updated.status === "forbidden") return historyCode(403, "failed");
    if (updated.status === "unlinked") return historyCode(409, "team_unlinked");
    const summary = summaryFor(updated.row, gate.account);
    if (!summary) return historyCode(404, "not_found");
    return NextResponse.json({ conversation: summary });
  } catch (err) {
    console.error("history update failed", err);
    return historyCode(500, "failed");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const gate = await requireHistoryUser(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  if (!isUuid(id)) return historyCode(400, "invalid");
  try {
    const removed = await deleteConversation(id, gate.account.userId);
    if (!removed) return historyCode(404, "not_found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("history delete failed", err);
    return historyCode(500, "failed");
  }
}
