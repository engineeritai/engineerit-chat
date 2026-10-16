import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeAttachments, type StoredAttachment } from "@/lib/attachmentMeta";
import { isUuid, type HistoryAccount } from "@/lib/historyAccess";
import {
  daysUntilExpiry,
  expiresAtFromCreated,
  isExpired,
  isNearingExpiry,
} from "@/lib/historyRetention";

export type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  discipline: string | null;
  pinned: boolean;
  shared_with_team: boolean;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  attachments: StoredAttachment[];
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  discipline: string | null;
  pinned: boolean;
  sharedWithTeam: boolean;
  owned: boolean;
  nearingExpiry: boolean;
  expiresInDays: number | null;
  updatedAt: string;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments: StoredAttachment[];
  createdAt: string;
};

const LIST_COLUMNS =
  "id, user_id, title, discipline, pinned, shared_with_team, team_id, created_at, updated_at, expires_at";

function cleanTitle(value: unknown, fallback: string) {
  const title = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return title || fallback;
}

function cleanDiscipline(value: unknown) {
  const discipline = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return discipline || null;
}

function cleanContent(value: unknown) {
  return String(value ?? "").slice(0, 100_000);
}

function searchTerm(value: string) {
  return value.replace(/[%_\\]/g, "").trim().slice(0, 80);
}

export function summaryFor(
  row: ConversationRow,
  account: HistoryAccount,
  now = new Date()
): ConversationSummary | null {
  const owned = row.user_id === account.userId;
  const expiresAt = owned
    ? expiresAtFromCreated(row.created_at, account.rawTier)
    : row.expires_at;
  if (isExpired(expiresAt, now)) return null;
  const nearing = owned
    ? isNearingExpiry(expiresAt, account.rawTier, now)
    : Boolean(expiresAt) && (daysUntilExpiry(expiresAt, now) ?? 99) <= 7;
  return {
    id: row.id,
    title: row.title,
    discipline: row.discipline,
    pinned: row.pinned,
    sharedWithTeam: row.shared_with_team,
    owned,
    nearingExpiry: nearing,
    expiresInDays: daysUntilExpiry(expiresAt, now),
    updatedAt: row.updated_at,
  };
}

async function refreshOwnerExpiry(rows: ConversationRow[], account: HistoryAccount) {
  const updates: { id: string; expires_at: string | null }[] = [];
  for (const row of rows) {
    if (row.user_id !== account.userId) continue;
    const next = expiresAtFromCreated(row.created_at, account.rawTier);
    if ((row.expires_at ?? null) === (next ?? null)) continue;
    updates.push({ id: row.id, expires_at: next });
  }
  await Promise.all(
    updates.map((item) =>
      supabaseAdmin.from("conversations").update({ expires_at: item.expires_at }).eq("id", item.id)
    )
  );
}

export async function listConversations(account: HistoryAccount, query: string) {
  const own = await supabaseAdmin
    .from("conversations")
    .select(LIST_COLUMNS)
    .eq("user_id", account.userId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);

  if (own.error) throw own.error;
  const ownRows = (own.data ?? []) as ConversationRow[];
  await refreshOwnerExpiry(ownRows, account);

  let sharedRows: ConversationRow[] = [];
  if (account.teamIds.length > 0) {
    const shared = await supabaseAdmin
      .from("conversations")
      .select(LIST_COLUMNS)
      .in("team_id", account.teamIds)
      .eq("shared_with_team", true)
      .neq("user_id", account.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (shared.error) throw shared.error;
    sharedRows = (shared.data ?? []) as ConversationRow[];
  }

  let rows = [...ownRows, ...sharedRows];
  const term = searchTerm(query);
  if (term) {
    const ids = rows.map((row) => row.id);
    const like = `%${term}%`;
    const titleHits = new Set(
      rows.filter((row) => row.title.toLowerCase().includes(term.toLowerCase())).map((row) => row.id)
    );
    if (ids.length > 0) {
      const messages = await supabaseAdmin
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", ids)
        .ilike("content", like)
        .limit(200);
      if (messages.error) throw messages.error;
      for (const hit of messages.data ?? []) titleHits.add(String(hit.conversation_id));
    }
    rows = rows.filter((row) => titleHits.has(row.id));
  }

  const now = new Date();
  return rows
    .map((row) => summaryFor(row, account, now))
    .filter((row): row is ConversationSummary => row != null)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });
}

export async function getOwnedConversation(id: string, userId: string) {
  const result = await supabaseAdmin
    .from("conversations")
    .select(LIST_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw result.error;
  return (result.data as ConversationRow | null) ?? null;
}

export async function getVisibleConversation(id: string, account: HistoryAccount) {
  const owned = await getOwnedConversation(id, account.userId);
  if (owned) return owned;
  if (account.teamIds.length === 0) return null;
  const shared = await supabaseAdmin
    .from("conversations")
    .select(LIST_COLUMNS)
    .eq("id", id)
    .eq("shared_with_team", true)
    .in("team_id", account.teamIds)
    .maybeSingle();
  if (shared.error) throw shared.error;
  return (shared.data as ConversationRow | null) ?? null;
}

export async function listMessages(conversationId: string): Promise<StoredMessage[]> {
  const result = await supabaseAdmin
    .from("messages")
    .select("id, role, content, attachments, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    id: String(row.id),
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content ?? ""),
    attachments: sanitizeAttachments(row.attachments),
    createdAt: String(row.created_at),
  }));
}

export async function createConversation(args: {
  account: HistoryAccount;
  id?: string;
  title: string;
  discipline?: string | null;
}) {
  const id = args.id && isUuid(args.id) ? args.id : crypto.randomUUID();
  const existing = await supabaseAdmin
    .from("conversations")
    .select(LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const row = existing.data as ConversationRow;
    if (row.user_id !== args.account.userId) {
      return { conflict: true as const };
    }
    return { conflict: false as const, row };
  }

  const now = new Date().toISOString();
  const inserted = await supabaseAdmin
    .from("conversations")
    .insert({
      id,
      user_id: args.account.userId,
      title: cleanTitle(args.title, "New conversation"),
      discipline: cleanDiscipline(args.discipline),
      pinned: false,
      shared_with_team: false,
      team_id: null,
      created_at: now,
      updated_at: now,
      expires_at: expiresAtFromCreated(now, args.account.rawTier),
    })
    .select(LIST_COLUMNS)
    .single();
  if (inserted.error) throw inserted.error;
  return { conflict: false as const, row: inserted.data as ConversationRow };
}

export async function updateConversation(args: {
  account: HistoryAccount;
  id: string;
  title?: unknown;
  discipline?: unknown;
  pinned?: unknown;
  sharedWithTeam?: unknown;
}) {
  const current = await getOwnedConversation(args.id, args.account.userId);
  if (!current) return { status: "missing" as const };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (args.title !== undefined) patch.title = cleanTitle(args.title, current.title);
  if (args.discipline !== undefined) patch.discipline = cleanDiscipline(args.discipline);
  if (typeof args.pinned === "boolean") patch.pinned = args.pinned;

  if (typeof args.sharedWithTeam === "boolean") {
    if (!args.sharedWithTeam) {
      patch.shared_with_team = false;
    } else {
      if (args.account.tier !== "team" && args.account.tier !== "enterprise") {
        return { status: "forbidden" as const };
      }
      const teamId = args.account.teamIds[0];
      if (!teamId) return { status: "unlinked" as const };
      patch.shared_with_team = true;
      patch.team_id = teamId;
    }
  }

  const updated = await supabaseAdmin
    .from("conversations")
    .update(patch)
    .eq("id", args.id)
    .eq("user_id", args.account.userId)
    .select(LIST_COLUMNS)
    .single();
  if (updated.error) throw updated.error;
  return { status: "ok" as const, row: updated.data as ConversationRow };
}

export async function deleteConversation(id: string, userId: string) {
  const result = await supabaseAdmin
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (result.error) throw result.error;
  return (result.data ?? []).length > 0;
}

export type IncomingMessage = {
  id?: unknown;
  role?: unknown;
  content?: unknown;
  attachments?: unknown;
};

export async function appendMessages(args: {
  account: HistoryAccount;
  conversationId: string;
  messages: IncomingMessage[];
}) {
  const conversation = await getOwnedConversation(args.conversationId, args.account.userId);
  if (!conversation) return false;

  const rows = [];
  for (const message of args.messages.slice(0, 20)) {
    const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
    if (!role) continue;
    const content = cleanContent(message.content);
    const attachments = sanitizeAttachments(message.attachments);
    if (!content.trim() && attachments.length === 0) continue;
    rows.push({
      id: isUuid(message.id) ? message.id : crypto.randomUUID(),
      conversation_id: conversation.id,
      user_id: args.account.userId,
      role,
      content,
      attachments,
    });
  }
  if (rows.length === 0) return true;

  const inserted = await supabaseAdmin.from("messages").upsert(rows, {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  if (inserted.error) throw inserted.error;

  const title = conversation.title.trim();
  const firstUser = rows.find((row) => row.role === "user" && row.content.trim());
  const nextTitle =
    (!title || title === "New conversation") && firstUser
      ? cleanTitle(firstUser.content, title || "New conversation")
      : conversation.title;

  await supabaseAdmin
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
      title: nextTitle,
      expires_at: expiresAtFromCreated(conversation.created_at, args.account.rawTier),
    })
    .eq("id", conversation.id)
    .eq("user_id", args.account.userId);

  return true;
}

export async function purgeExpiredConversations() {
  const rpc = await supabaseAdmin.rpc("purge_expired_conversations");
  if (!rpc.error && typeof rpc.data === "number") return rpc.data;

  if (rpc.error) console.error("purge_expired_conversations rpc failed", rpc.error);

  const now = new Date().toISOString();
  const expired = await supabaseAdmin
    .from("conversations")
    .delete()
    .lte("expires_at", now)
    .select("id");
  if (expired.error) throw expired.error;
  return (expired.data ?? []).length;
}
