"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

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

  function updateThread(fn: (t: Thread) => Thread) {
    setThreads((all) => all.map((t) => (t.id === currentThreadId ? fn(t) : t)));
  }

  async function send() {
    if (!thread || !input.trim() || sending) return;

    const userText = input.trim();
    setInput("");

    updateThread((t) => ({
      ...t,
      title: t.messages.length === 0 ? userText.slice(0, 64) : t.title,
      messages: [...t.messages, { id: uuid(), role: "user", content: userText }],
    }));

    setSending(true);
    try {
      const payloadMessages = (thread.messages || []).concat({
        id: "temp",
        role: "user",
        content: userText,
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline, messages: payloadMessages }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed ${res.status}`);
      }

      const data = (await res.json()) as { reply: string };
      updateThread((t) => ({
        ...t,
        messages: [
          ...t.messages,
          { id: uuid(), role: "assistant", content: data.reply || "" },
        ],
      }));
    } catch (e: any) {
      console.error(e);
      updateThread((t) => ({
        ...t,
        messages: [
          ...t.messages,
          {
            id: uuid(),
            role: "assistant",
            content:
              "Sorry, I couldn’t complete that request. Ensure your OPENAI_API_KEY is set and /api/chat is working.",
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
      <Sidebar
        discipline={discipline}
        onDisciplineChange={setDiscipline}
        onNewChat={onNewChat}
        threads={threads}
        currentThreadId={currentThreadId}
        onSelectThread={onSelectThread}
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="section-title">Conversation</div>

        <div className="chat-wrap">
          {(thread?.messages || []).map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} />
          ))}
        </div>

                {/* Composer */}
        <div className="composer">
          <div className="composer-box">
            {/* Toolbar */}
            <div className="composer-toolbar">
              <button
                className="toolbar-btn"
                title="Add attachment"
                onClick={() => alert("Attachment menu coming soon")}
              >
                +
              </button>

              <button
                className="toolbar-btn"
                title="Upload image"
                onClick={() =>
                  document.getElementById("image-upload")?.click()
                }
              >
                📷
              </button>

              <button
                className="toolbar-btn"
                title="Upload file"
                onClick={() =>
                  document.getElementById("file-upload")?.click()
                }
              >
                📄
              </button>

              <button
                className="toolbar-btn"
                title="Scan document"
                onClick={() => alert("Scan feature coming soon")}
              >
                🖨️
              </button>

              <button
                className="toolbar-btn"
                title="Press to Talk"
                onMouseDown={() => console.log("Start Recording…")}
                onMouseUp={() => console.log("Stop Recording…")}
              >
                🎤
              </button>
            </div>

            {/* Hidden Inputs */}
            <input type="file" id="image-upload" accept="image/*" hidden />
            <input type="file" id="file-upload" hidden />

            {/* Textarea */}
            <textarea
              className="textarea"
              placeholder="Ask an engineering question… (Enter to send)"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // auto-resize
                e.target.style.height = "45px";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={onKeyDown}
            />

            {/* Send button */}
            <button
              className="send-btn"
              disabled={sending || !input.trim()}
              onClick={send}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
