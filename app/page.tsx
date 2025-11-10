// app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
};

type Thread = {
  id: string;
  title: string;
  discipline: string;
  messages: Message[];
};

function uuid() {
  return Math.random().toString(36).slice(2);
}

export default function Page() {
  const [discipline, setDiscipline] = useState("General");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // ensure a thread exists
  useEffect(() => {
    if (!currentThreadId) {
      const t: Thread = {
        id: uuid(),
        title: "New conversation",
        discipline,
        messages: [],
      };
      setThreads([t]);
      setCurrentThreadId(t.id);
    }
  }, [currentThreadId, discipline]);

  const thread = useMemo(
    () => threads.find((t) => t.id === currentThreadId),
    [threads, currentThreadId]
  );

  function onNewChat() {
    const t: Thread = {
      id: uuid(),
      title: "New conversation",
      discipline,
      messages: [],
    };
    setThreads((prev) => [t, ...prev]);
    setCurrentThreadId(t.id);
  }

  function onSelectThread(id: string) {
    setCurrentThreadId(id);
  }

  function updateThread(updater: (t: Thread) => Thread) {
    if (!thread) return;
    setThreads((all) => all.map((t) => (t.id === thread.id ? updater(t) : t)));
  }

  async function send() {
    if (!thread || !input.trim() || sending) return;
    const userText = input.trim();
    setInput("");

    // add user message
    updateThread((t) => ({
      ...t,
      title: t.messages.length === 0 ? userText.slice(0, 64) : t.title,
      messages: [...t.messages, { id: uuid(), role: "user", content: userText }],
    }));

    setSending(true);
    try {
      // Call your API (make sure app/api/chat/route.ts exists & OPENAI_API_KEY is set)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discipline,
          messages: (thread?.messages || []).concat({
            id: "temp",
            role: "user",
            content: userText,
          }),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed ${res.status}`);
      }

      const data = (await res.json()) as { reply: string };
      updateThread((t) => ({
        ...t,
        messages: [...t.messages, { id: uuid(), role: "assistant", content: data.reply || "" }],
      }));
    } catch (e: any) {
      updateThread((t) => ({
        ...t,
        messages: [
          ...t.messages,
          {
            id: uuid(),
            role: "assistant",
            content:
              "Sorry, I couldn’t complete that request. Check your API key (/api/chat) or try again.",
          },
        ],
      }));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="app-shell">
      {/* Left */}
      <Sidebar
        discipline={discipline}
        onDisciplineChange={setDiscipline}
        onNewChat={onNewChat}
        threads={threads}
        currentThreadId={currentThreadId}
        onSelectThread={onSelectThread}
      />

      {/* Right */}
      <div className="main">
        <Header />

        <div className="section-title">Conversation</div>

        <div className="chat-wrap">
          {(thread?.messages || []).map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} />
          ))}
        </div>

        {/* Composer */}
        <div className="composer">
          <div style={{ display: "flex", gap: 10, maxWidth: 960 }}>
            <textarea
              className="textarea"
              placeholder="Ask an engineering question… (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button className="btn" disabled={sending} onClick={send}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
