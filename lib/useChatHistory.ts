"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Locale } from "@/lib/i18n";
import type { StoredAttachment } from "@/lib/attachmentMeta";
import {
  createHistory,
  deleteHistory,
  downloadHistoryExport,
  fetchHistory,
  listHistory,
  patchHistory,
  saveHistoryMessages,
  type ConversationSummary,
  type HistoryCode,
} from "@/lib/chatHistoryClient";

export type ChatAttachment = {
  id: string;
  name: string;
  type: "image" | "file";
  url?: string;
  mime?: string;
  size?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

export type ChatThread = {
  id: string;
  title: string;
  discipline: string;
  messages: ChatMessage[];
  pinned: boolean;
  sharedWithTeam: boolean;
  owned: boolean;
  persisted: boolean;
  messagesLoaded: boolean;
  nearingExpiry: boolean;
  expiresInDays: number | null;
};

function draftThread(title: string, discipline: string): ChatThread {
  return {
    id: crypto.randomUUID(),
    title,
    discipline,
    messages: [],
    pinned: false,
    sharedWithTeam: false,
    owned: true,
    persisted: false,
    messagesLoaded: true,
    nearingExpiry: false,
    expiresInDays: null,
  };
}

function applySummary(row: ConversationSummary, existing: ChatThread | undefined, discipline: string): ChatThread {
  return {
    id: row.id,
    title: row.title,
    discipline: row.discipline || existing?.discipline || discipline,
    messages: existing?.messages ?? [],
    pinned: row.pinned,
    sharedWithTeam: row.sharedWithTeam,
    owned: row.owned,
    persisted: true,
    messagesLoaded: existing?.messagesLoaded ?? false,
    nearingExpiry: row.nearingExpiry,
    expiresInDays: row.expiresInDays,
  };
}

function attachmentMeta(message: ChatMessage): StoredAttachment[] {
  return (message.attachments ?? []).flatMap((item) => {
    const name = item.name?.trim();
    if (!name) return [];
    return [
      {
        name,
        type: item.type,
        ...(item.mime ? { mime: item.mime } : {}),
        ...(typeof item.size === "number" ? { size: item.size } : {}),
      },
    ];
  });
}

export function useChatHistory(opts: { locale: Locale; discipline: string; draftTitle: string }) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [sidebarThreads, setSidebarThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<HistoryCode | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const threadsRef = useRef<ChatThread[]>([]);
  const currentIdRef = useRef<string | undefined>(undefined);
  const localeRef = useRef(opts.locale);
  const disciplineRef = useRef(opts.discipline);
  const draftTitleRef = useRef(opts.draftTitle);
  const queryRef = useRef(query);
  const userIdRef = useRef<string | null>(null);
  const loadedForRef = useRef<string | null>(null);

  useEffect(() => {
    localeRef.current = opts.locale;
    disciplineRef.current = opts.discipline;
    draftTitleRef.current = opts.draftTitle;
    queryRef.current = query;
    userIdRef.current = userId;
  }, [opts.locale, opts.discipline, opts.draftTitle, query, userId]);

  function commit(next: ChatThread[]) {
    threadsRef.current = next;
    setThreads(next);
  }

  function select(id: string) {
    currentIdRef.current = id;
    setCurrentThreadId(id);
  }

  function resetSignedOut() {
    loadedForRef.current = null;
    const local = threadsRef.current.filter((thread) => !thread.persisted && thread.messages.length > 0);
    const next = local.length > 0 ? local : [draftThread(draftTitleRef.current, disciplineRef.current)];
    commit(next);
    setSidebarThreads(next);
    if (!next.some((thread) => thread.id === currentIdRef.current)) select(next[0].id);
    setLoading(false);
  }

  useEffect(() => {
    let cancel = false;
    const applyUser = (id: string | null) => {
      if (cancel) return;
      if (!id) resetSignedOut();
      setUserId(id);
      setReady(true);
    };
    void supabase.auth.getSession().then(({ data }) => {
      applyUser(data.session?.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user?.id ?? null);
    });
    return () => {
      cancel = true;
      data.subscription.unsubscribe();
    };
    // Auth subscription. Helpers read refs, so the first closure stays correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;

    let cancel = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void (async () => {
        const result = await listHistory(localeRef.current, queryRef.current);
        if (cancel) return;
        setLoading(false);
        if (!result.ok) {
          setNotice(result.code);
          if (threadsRef.current.length === 0) {
            const draft = draftThread(draftTitleRef.current, disciplineRef.current);
            commit([draft]);
            setSidebarThreads([draft]);
            select(draft.id);
          }
          return;
        }

        const prev = threadsRef.current;
        const locals = prev.filter((thread) => !thread.persisted && thread.messages.length > 0);
        const mapped = result.conversations.map((row) =>
          applySummary(row, prev.find((thread) => thread.id === row.id), disciplineRef.current)
        );
        const sidebar = [...locals, ...mapped];
        const current = prev.find((thread) => thread.id === currentIdRef.current);
        const next =
          current && !sidebar.some((thread) => thread.id === current.id) ? [current, ...sidebar] : sidebar;
        const resolved = next.length > 0 ? next : [draftThread(draftTitleRef.current, disciplineRef.current)];
        commit(resolved);
        setSidebarThreads(sidebar.length > 0 ? sidebar : resolved);

        const firstLoad = loadedForRef.current !== userId;
        loadedForRef.current = userId;
        const selectedStillThere = resolved.some((thread) => thread.id === currentIdRef.current);
        if (firstLoad || !selectedStillThere) {
          const preferred = sidebar.find((thread) => thread.persisted) ?? resolved[0];
          select(preferred.id);
        }
      })();
    }, 250);

    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [ready, userId, query, reloadKey]);

  const pendingLoadId =
    threads.find((thread) => thread.id === currentThreadId && thread.persisted && !thread.messagesLoaded)?.id ??
    null;

  useEffect(() => {
    if (!pendingLoadId || !userId) return;
    let cancel = false;
    void (async () => {
      const result = await fetchHistory(localeRef.current, pendingLoadId);
      if (cancel) return;
      if (!result.ok) {
        setNotice(result.code);
        return;
      }
      const next = threadsRef.current.map((thread) =>
        thread.id === pendingLoadId
          ? {
              ...applySummary(result.conversation, thread, disciplineRef.current),
              messages: result.messages.map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                attachments: message.attachments.map((item, index) => ({
                  id: `${message.id}-${index}`,
                  name: item.name,
                  type: item.type,
                  mime: item.mime,
                  size: item.size,
                })),
              })),
              messagesLoaded: true,
            }
          : thread
      );
      commit(next);
      setSidebarThreads((prev) =>
        prev.map((thread) => next.find((item) => item.id === thread.id) ?? thread)
      );
    })();
    return () => {
      cancel = true;
    };
  }, [pendingLoadId, userId]);

  function appendLocal(message: ChatMessage, titleHint?: string) {
    const id = currentIdRef.current;
    if (!id) return;
    const next = threadsRef.current.map((thread) => {
      if (thread.id !== id) return thread;
      const title =
        thread.messages.length === 0 && titleHint && thread.title === draftTitleRef.current
          ? titleHint.slice(0, 64)
          : thread.title;
      return { ...thread, title, messages: [...thread.messages, message], messagesLoaded: true };
    });
    commit(next);
    setSidebarThreads((prev) => prev.map((thread) => next.find((item) => item.id === thread.id) ?? thread));
  }

  async function persistMessages(messages: ChatMessage[]) {
    if (!userIdRef.current) return;
    const thread = threadsRef.current.find((item) => item.id === currentIdRef.current);
    if (!thread || !thread.owned) return;

    let conversationId = thread.id;
    if (!thread.persisted) {
      const created = await createHistory({
        locale: localeRef.current,
        id: thread.id,
        title: thread.title,
        discipline: disciplineRef.current || thread.discipline,
      });
      if (!created.ok) {
        setNotice(created.code);
        return;
      }
      conversationId = created.conversation.id;
      const next = threadsRef.current.map((item) =>
        item.id === thread.id
          ? {
              ...item,
              ...applySummary(created.conversation, item, disciplineRef.current),
              messages: item.messages,
              messagesLoaded: true,
            }
          : item
      );
      commit(next);
      setSidebarThreads((prev) => {
        const without = prev.filter((item) => item.id !== thread.id && item.id !== conversationId);
        const saved = next.find((item) => item.id === conversationId);
        return saved ? [saved, ...without] : without;
      });
      if (conversationId !== thread.id) select(conversationId);
    }

    const saved = await saveHistoryMessages(
      localeRef.current,
      conversationId,
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        attachments: attachmentMeta(message),
      }))
    );
    if (!saved.ok) setNotice(saved.code);
  }

  function onNewChat() {
    const existing = threadsRef.current.find((thread) => !thread.persisted && thread.messages.length === 0);
    if (existing) {
      select(existing.id);
      return;
    }
    const draft = draftThread(draftTitleRef.current, disciplineRef.current);
    const next = [draft, ...threadsRef.current];
    commit(next);
    setSidebarThreads((prev) => [draft, ...prev]);
    select(draft.id);
  }

  async function renameThread(id: string, title: string) {
    const trimmed = title.replace(/\s+/g, " ").trim().slice(0, 120);
    if (!trimmed) return;
    const thread = threadsRef.current.find((item) => item.id === id);
    if (!thread?.owned) return;
    const next = threadsRef.current.map((item) => (item.id === id ? { ...item, title: trimmed } : item));
    commit(next);
    setSidebarThreads((prev) => prev.map((item) => (item.id === id ? { ...item, title: trimmed } : item)));
    if (!thread.persisted) return;
    const result = await patchHistory(localeRef.current, id, { title: trimmed });
    if (!result.ok) setNotice(result.code);
  }

  async function pinThread(id: string, pinned: boolean) {
    const thread = threadsRef.current.find((item) => item.id === id);
    if (!thread?.owned) return;
    const next = threadsRef.current.map((item) => (item.id === id ? { ...item, pinned } : item));
    next.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return 0;
    });
    commit(next);
    setSidebarThreads((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, pinned } : item));
      updated.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
      return updated;
    });
    if (!thread.persisted) return;
    const result = await patchHistory(localeRef.current, id, { pinned });
    if (!result.ok) setNotice(result.code);
  }

  async function shareThread(id: string, sharedWithTeam: boolean) {
    const thread = threadsRef.current.find((item) => item.id === id);
    if (!thread?.owned || !thread.persisted) return;
    const result = await patchHistory(localeRef.current, id, { sharedWithTeam });
    if (!result.ok) {
      setNotice(result.code);
      return;
    }
    const next = threadsRef.current.map((item) =>
      item.id === id ? { ...item, sharedWithTeam: result.conversation.sharedWithTeam } : item
    );
    commit(next);
    setSidebarThreads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, sharedWithTeam: result.conversation.sharedWithTeam } : item
      )
    );
  }

  async function deleteThread(id: string) {
    const thread = threadsRef.current.find((item) => item.id === id);
    if (!thread?.owned) return;
    if (thread.persisted) {
      const result = await deleteHistory(localeRef.current, id);
      if (!result.ok) {
        setNotice(result.code);
        return;
      }
    }
    const remaining = threadsRef.current.filter((item) => item.id !== id);
    const next = remaining.length > 0 ? remaining : [draftThread(draftTitleRef.current, disciplineRef.current)];
    commit(next);
    setSidebarThreads((prev) => {
      const sidebar = prev.filter((item) => item.id !== id);
      return sidebar.length > 0 ? sidebar : next;
    });
    if (currentIdRef.current === id) select(next[0].id);
  }

  async function syncDiscipline(discipline: string) {
    disciplineRef.current = discipline;
    const id = currentIdRef.current;
    const thread = threadsRef.current.find((item) => item.id === id);
    if (!thread?.owned) return;
    const next = threadsRef.current.map((item) => (item.id === id ? { ...item, discipline } : item));
    commit(next);
    if (!thread.persisted) return;
    const result = await patchHistory(localeRef.current, thread.id, { discipline });
    if (!result.ok) setNotice(result.code);
  }

  async function exportCurrent(format: "pdf" | "docx") {
    const thread = threadsRef.current.find((item) => item.id === currentIdRef.current);
    if (!thread?.persisted) return;
    const result = await downloadHistoryExport(localeRef.current, thread.id, format);
    if (!result.ok) {
      setNotice(result.code);
      return;
    }
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const thread = threads.find((item) => item.id === currentThreadId);

  return {
    threads: sidebarThreads,
    thread,
    currentThreadId,
    userId,
    loading,
    query,
    setQuery,
    refresh: () => setReloadKey((value) => value + 1),
    notice,
    clearNotice: () => setNotice(null),
    appendLocal,
    persistMessages,
    onNewChat,
    selectThread: select,
    renameThread,
    pinThread,
    shareThread,
    deleteThread,
    syncDiscipline,
    exportCurrent,
  };
}
