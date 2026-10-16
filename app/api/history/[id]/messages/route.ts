import { historyCode, isUuid, requireHistoryUser } from "@/lib/historyAccess";
import { appendMessages, type IncomingMessage } from "@/lib/historyDb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireHistoryUser(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  if (!isUuid(id)) return historyCode(400, "invalid");
  const body = (await request.json().catch(() => null)) as { messages?: IncomingMessage[] } | null;
  if (!body || !Array.isArray(body.messages)) return historyCode(400, "invalid");
  try {
    const saved = await appendMessages({
      account: gate.account,
      conversationId: id,
      messages: body.messages,
    });
    if (!saved) return historyCode(404, "not_found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("history append failed", err);
    return historyCode(500, "failed");
  }
}
