"use client";

import { getAccessToken } from "@/lib/accessToken";
import type { StoredAttachment } from "@/lib/attachmentMeta";
import type { Locale } from "@/lib/i18n";
import type { ConversationSummary, StoredMessage } from "@/lib/historyDb";

export type HistoryCode =
  | "unauthorized"
  | "not_found"
  | "invalid"
  | "failed"
  | "export_locked"
  | "export_limit"
  | "team_unlinked";

export type { ConversationSummary, StoredMessage };

async function authHeaders(locale: Locale, json = false): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { "x-locale": locale };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function readCode(res: Response): Promise<HistoryCode> {
  const data = (await res.json().catch(() => null)) as { code?: string } | null;
  const code = data?.code;
  if (
    code === "unauthorized" ||
    code === "not_found" ||
    code === "invalid" ||
    code === "export_locked" ||
    code === "export_limit" ||
    code === "team_unlinked"
  ) {
    return code;
  }
  return "failed";
}

export async function listHistory(locale: Locale, query: string) {
  const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const res = await fetch(`/api/history${params}`, {
    headers: await authHeaders(locale),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, code: await readCode(res) };
  const data = (await res.json()) as { conversations: ConversationSummary[] };
  return { ok: true as const, conversations: data.conversations ?? [] };
}

export async function createHistory(args: {
  locale: Locale;
  id: string;
  title: string;
  discipline: string;
}) {
  const res = await fetch("/api/history", {
    method: "POST",
    headers: await authHeaders(args.locale, true),
    body: JSON.stringify({
      id: args.id,
      title: args.title,
      discipline: args.discipline,
    }),
  });
  if (!res.ok) return { ok: false as const, code: await readCode(res) };
  const data = (await res.json()) as { conversation: ConversationSummary };
  return { ok: true as const, conversation: data.conversation };
}

export async function fetchHistory(locale: Locale, id: string) {
  const res = await fetch(`/api/history/${id}`, {
    headers: await authHeaders(locale),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, code: await readCode(res) };
  const data = (await res.json()) as {
    conversation: ConversationSummary;
    messages: StoredMessage[];
  };
  return { ok: true as const, conversation: data.conversation, messages: data.messages ?? [] };
}

export async function patchHistory(
  locale: Locale,
  id: string,
  patch: { title?: string; pinned?: boolean; sharedWithTeam?: boolean; discipline?: string }
) {
  const res = await fetch(`/api/history/${id}`, {
    method: "PATCH",
    headers: await authHeaders(locale, true),
    body: JSON.stringify(patch),
  });
  if (!res.ok) return { ok: false as const, code: await readCode(res) };
  const data = (await res.json()) as { conversation: ConversationSummary };
  return { ok: true as const, conversation: data.conversation };
}

export async function deleteHistory(locale: Locale, id: string) {
  const res = await fetch(`/api/history/${id}`, {
    method: "DELETE",
    headers: await authHeaders(locale),
  });
  if (!res.ok) return { ok: false as const, code: await readCode(res) };
  return { ok: true as const };
}

export async function saveHistoryMessages(
  locale: Locale,
  id: string,
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt?: string;
    attachments?: StoredAttachment[];
  }[]
) {
  const res = await fetch(`/api/history/${id}/messages`, {
    method: "POST",
    headers: await authHeaders(locale, true),
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) return { ok: false as const, code: await readCode(res) };
  return { ok: true as const };
}

export async function downloadHistoryExport(locale: Locale, id: string, format: "pdf" | "docx") {
  const res = await fetch(`/api/history/${id}/export?format=${format}&locale=${locale}`, {
    headers: await authHeaders(locale),
  });
  if (!res.ok) return { ok: false as const, code: await readCode(res) };
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  return { ok: true as const, blob, filename: match?.[1] || `engineerit-chat.${format}` };
}
