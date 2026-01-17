"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { supabase } from "@/lib/supabaseClient";

type Role = "user" | "assistant";

type Attachment = {
  id: string;
  name: string;
  type: "image" | "file";
  url: string; // data URL for images, object URL for files
  file?: File;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
};

type Thread = {
  id: string;
  title: string;
  discipline: string;
  messages: Message[];
};

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

function uuid() {
  return Math.random().toString(36).slice(2);
}

/* ============================
   Engineer tools configuration
   ============================ */

const ENGINEER_TOOLS = [
  { id: "drawing", label: "Drawing & Diagrams" },
  { id: "design", label: "Design & Code Check" },
  { id: "itp", label: "ITP & QA/QC" },
  { id: "boq", label: "BOQ & Quantities" },
  { id: "schedule", label: "Schedule & Resources" },
  { id: "value", label: "Value Engineering" },
  { id: "dashboard", label: "Project Dashboards" },
] as const;

type ToolId = (typeof ENGINEER_TOOLS)[number]["id"];

const TOOL_ACCESS: Record<PlanId, ToolId[]> = {
  assistant: [],
  engineer: ["drawing", "design"],
  professional: ["drawing", "design", "itp", "boq"],
  consultant: [
    "drawing",
    "design",
    "itp",
    "boq",
    "schedule",
    "value",
    "dashboard",
  ],
};

function hasAccess(planId: PlanId, toolId: ToolId) {
  return TOOL_ACCESS[planId]?.includes(toolId);
}

/* ============================
   Helpers: RTL + HTML Share
   ============================ */

function isArabicText(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtmlDocument(aiText: string) {
  const rtl = isArabicText(aiText);
  const safe = escapeHtml(aiText);

  return `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>engineerit.ai</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px;color:#111827;background:#fff;}
  .wrap{max-width:980px;margin:0 auto;}
  .card{border:1px solid #e5e7eb;border-radius:16px;padding:18px;background:#fff;}
  pre{white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;line-height:1.6;}
  .footer{margin-top:14px;color:#6b7280;font-size:12px}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card"><pre>${safe}</pre></div>
    <div class="footer">— engineerit.ai</div>
  </div>
</body>
</html>`;
}

function htmlFileFromText(aiText: string) {
  const html = buildHtmlDocument(aiText);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], "engineerit.ai", {
    type: "text/html",
  });
  return { html, blob, file };
}

async function copyAsHtml(aiText: string) {
  const { html } = htmlFileFromText(aiText);
  try {
    // @ts-ignore
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([aiText], { type: "text/plain" }),
      });
      // @ts-ignore
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {}
  try {
    await navigator.clipboard.writeText(aiText);
    return true;
  } catch {}
  return false;
}

function saveHtml(aiText: string) {
  const { blob } = htmlFileFromText(aiText);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "engineerit.ai";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printHtml(aiText: string) {
  const html = buildHtmlDocument(aiText);
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function pdfHtml(aiText: string) {
  // browser print -> Save as PDF
  printHtml(aiText);
}

async function nativeShareHtml(aiText: string) {
  const { file } = htmlFileFromText(aiText);
  try {
    // @ts-ignore
    if (navigator.share) {
      // @ts-ignore
      if (navigator.canShare?.({ files: [file] })) {
        // @ts-ignore
        await navigator.share({
          title: "engineerit.ai",
          text: "engineerit.ai",
          files: [file],
        });
        return true;
      }
      // @ts-ignore
      await navigator.share({
        title: "engineerit.ai",
        text: "engineerit.ai",
      });
      return true;
    }
  } catch {}
  return false;
}

/* ============================
   Daily limits (client quick)
   - Guest: 1/day (browser)
   - Assistant: 3/day (browser)
   - Paid: open
   NOTE: Real IP/day enforced in /api/chat route.ts
   ============================ */

function todayUTCKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getLocalCount(key: string) {
  try {
    const v = window.localStorage.getItem(key);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLocalCount(key: string, n: number) {
  try {
    window.localStorage.setItem(key, String(n));
  } catch {}
}

export default function Page() {
  const [discipline, setDiscipline] = useState("General");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [isGuest, setIsGuest] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  const [planId, setPlanId] = useState<PlanId>("assistant");

  const [showMobileTools, setShowMobileTools] = useState(false);

  const [showLanding, setShowLanding] = useState(false);

  const [openShareFor, setOpenShareFor] = useState<string | null>(null);

  // Gate modal (Register / Upgrade)
  const [showGate, setShowGate] = useState(false);
  const [gateMode, setGateMode] = useState<"register" | "upgrade">("register");
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const isPaidPlan =
    planId === "engineer" || planId === "professional" || planId === "consultant";

  const attachmentsAllowed = isPaidPlan && !isGuest;

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setPlanId("assistant");
          setIsGuest(true);
          setUserId(null);
          return;
        }

        setIsGuest(false);
        setUserId(user.id);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && profile?.subscription_tier) {
          const p = profile.subscription_tier as PlanId;
          if (p === "assistant" || p === "engineer" || p === "professional" || p === "consultant") {
            setPlanId(p);
          } else {
            setPlanId("assistant");
          }
        } else {
          setPlanId("assistant");
        }
      } catch (err) {
        console.error(err);
        setPlanId("assistant");
        setIsGuest(true);
        setUserId(null);
      }
    };

    void loadPlan();
  }, []);

  useEffect(() => {
    try {
      const KEY = "engineerit_landing_seen_v1";
      const seen = window.localStorage.getItem(KEY);
      if (!seen) setShowLanding(true);
    } catch {
      setShowLanding(true);
    }
  }, []);

  const handleCloseLanding = () => {
    try {
      const KEY = "engineerit_landing_seen_v1";
      window.localStorage.setItem(KEY, "yes");
    } catch {}
    setShowLanding(false);
  };

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

  const messages: Message[] = thread?.messages ?? [];

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

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!attachmentsAllowed) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setAttachments((prev) => [
        ...prev,
        { id: uuid(), name: file.name, type: "image", url, file },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!attachmentsAllowed) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAttachments((prev) => [
      ...prev,
      { id: uuid(), name: file.name, type: "file", url, file },
    ]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  async function analyzeImage(question: string, imageFile: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", imageFile, imageFile.name);
    formData.append("question", question || "Analyze this engineering image.");

    const res = await fetch("/api/image", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  async function analyzeDocument(question: string, docFile: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", docFile, docFile.name);
    formData.append("question", question || "Extract and summarize this document.");

    const res = await fetch("/api/document", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  function insertTemplate(template: string) {
    setInput((prev) => (prev ? `${prev}\n\n${template}` : template));
  }

  const handleEngineerToolClick = (toolId: ToolId) => {
    switch (toolId) {
      case "drawing":
        insertTemplate("Explain and analyze the attached engineering drawing (PFD / P&ID / block diagram).");
        break;
      case "design":
        insertTemplate("Check this engineering design against relevant codes and standards.");
        break;
      case "itp":
        insertTemplate("Generate an Inspection & Test Plan (ITP) and QA/QC checklist.");
        break;
      case "boq":
        insertTemplate("Propose a structured BOQ with items and units.");
        break;
      case "schedule":
        insertTemplate("Build a high-level project schedule.");
        break;
      case "value":
        insertTemplate("Perform a value engineering review.");
        break;
      case "dashboard":
        insertTemplate("Create a management dashboard summary (KPIs, risks, actions).");
        break;
      default:
        break;
    }
  };

  function openRegisterGate(msg?: string) {
    setGateMode("register");
    setLimitNotice(msg || null);
    setShowGate(true);
  }

  function openUpgradeGate(msg?: string) {
    setGateMode("upgrade");
    setLimitNotice(msg || null);
    setShowGate(true);
  }

  function checkDailyLimitOrGate() {
    if (typeof window === "undefined") return { ok: true as const, key: "", cur: 0 };

    const day = todayUTCKey();
    const planKey = isGuest ? "guest" : planId;
    const key = `engineerit_daily_${planKey}_${day}`;
    const cur = getLocalCount(key);

    const max = isGuest ? 1 : planId === "assistant" ? 3 : Number.POSITIVE_INFINITY;
    if (Number.isFinite(max) && cur >= max) {
      const msg =
        isGuest
          ? "Daily limit reached. Please register or log in."
          : "Daily limit reached. Please upgrade.";
      if (isGuest) openRegisterGate(msg);
      else if (planId === "assistant") openUpgradeGate(msg);
      return { ok: false as const, key, cur };
    }
    return { ok: true as const, key, cur };
  }

  function incrementLocalDailyCount(key: string, cur: number) {
    if (!key) return;
    setLocalCount(key, cur + 1);
  }

  async function send() {
    if (!thread || (!input.trim() && attachments.length === 0) || sending) return;

    // Daily limits
    const check = checkDailyLimitOrGate();
    if (!check.ok) return;

    const userText = input.trim();
    const userAttachments = attachments;
    setInput("");
    setAttachments([]);
    setIsAttachMenuOpen(false);

    updateThread((t) => ({
      ...t,
      title: t.messages.length === 0 ? userText.slice(0, 64) || "New conversation" : t.title,
      messages: [
        ...t.messages,
        {
          id: uuid(),
          role: "user",
          content: userText || "[Attachment-only message]",
          attachments: userAttachments,
        },
      ],
    }));

    setSending(true);

    try {
      const docAttachment = userAttachments.find((a) => a.type === "file" && a.file);
      const imgAttachment = userAttachments.find((a) => a.type === "image" && a.file);

      if (docAttachment) {
        const reply = await analyzeDocument(userText, docAttachment.file!);
        updateThread((t) => ({
          ...t,
          messages: [...t.messages, { id: uuid(), role: "assistant", content: reply }],
        }));
        incrementLocalDailyCount(check.key, check.cur);
      } else if (imgAttachment) {
        const reply = await analyzeImage(userText, imgAttachment.file!);
        updateThread((t) => ({
          ...t,
          messages: [...t.messages, { id: uuid(), role: "assistant", content: reply }],
        }));
        incrementLocalDailyCount(check.key, check.cur);
      } else {
        const payloadMessages = (thread.messages || []).concat({
          id: "temp",
          role: "user" as const,
          content: userText,
        });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discipline,
            messages: payloadMessages,
            planId: isGuest ? "guest" : planId,
            userId: userId,
          }),
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => null);
          const msg =
            data?.error ||
            (isGuest
              ? "Daily limit reached. Please register or log in."
              : "Daily limit reached. Please upgrade.");
          if (isGuest) openRegisterGate(msg);
          else if (planId === "assistant") openUpgradeGate(msg);

          updateThread((t) => ({
            ...t,
            messages: [
              ...t.messages,
              {
                id: uuid(),
                role: "assistant",
                content: isGuest
                  ? "Daily limit reached. Please register or log in to continue using engineerit.ai."
                  : "Daily limit reached. Please upgrade to continue.",
              },
            ],
          }));
          return;
        }

        if (!res.ok) throw new Error(await res.text());

        const data = (await res.json()) as { reply: string };

        updateThread((t) => ({
          ...t,
          messages: [...t.messages, { id: uuid(), role: "assistant", content: data.reply || "" }],
        }));

        incrementLocalDailyCount(check.key, check.cur);
      }
    } catch (e) {
      console.error(e);
      updateThread((t) => ({
        ...t,
        messages: [...t.messages, { id: uuid(), role: "assistant", content: "Sorry, something failed. Please try again." }],
      }));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="app-shell chat-page">
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

        {showLanding && (
          <div
            className="card"
            style={{
              margin: "12px 16px 4px 16px",
              padding: "12px 14px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Welcome to engineerit.ai
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>
                A digital AI-powered platform providing engineering intelligence services,
                including automated engineering analysis, data processing, remote technical consulting,
                and operating an interactive system that utilizes AI technologies to analyze documents,
                drawings, and enhance engineering experience.
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseLanding}
              aria-label="Close"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                padding: "2px 6px",
                color: "#6b7280",
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="engineer-tools">
          <span className="engineer-tools-label">Engineer tools:</span>
          <div className="engineer-tools-row">
            {ENGINEER_TOOLS.map((tool) => {
              const enabled = hasAccess(planId, tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  className={
                    "engineer-tools-btn" +
                    (enabled ? "" : " engineer-tools-btn-locked")
                  }
                  disabled={!enabled}
                  onClick={() => enabled && handleEngineerToolClick(tool.id)}
                >
                  {!enabled && <span className="tool-lock">🔒</span>}
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="engineer-tools-mobile">
          <button
            type="button"
            className="engineer-tools-mobile-toggle"
            onClick={() => setShowMobileTools((v) => !v)}
          >
            <span>Engineer tools for your plan</span>
            <span style={{ fontSize: 12 }}>{showMobileTools ? "▲" : "▼"}</span>
          </button>

          {showMobileTools && (
            <div className="engineer-tools-mobile-panel">
              <div className="engineer-tools-mobile-list">
                {ENGINEER_TOOLS.map((tool) => {
                  const enabled = hasAccess(planId, tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      className={
                        "engineer-tools-mobile-item" +
                        (enabled ? "" : " engineer-tools-mobile-item-locked")
                      }
                      disabled={!enabled}
                      onClick={() => {
                        if (!enabled) {
                          openUpgradeGate("This tool requires a higher subscription plan.");
                          return;
                        }
                        handleEngineerToolClick(tool.id);
                        setShowMobileTools(false);
                      }}
                    >
                      <div>
                        {enabled ? "✅" : "🔒"} <span>{tool.label}</span>
                      </div>
                      {!enabled && <span className="engineer-tools-mobile-plan-hint">Upgrade</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="conversation">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>Ask an engineering question to start the conversation.</p>
            </div>
          ) : (
            messages.map((m) => {
              const rtl = isArabicText(m.content);

              return (
                <div
                  key={m.id}
                  className={
                    "message-row " +
                    (m.role === "user" ? "message-user" : "message-assistant")
                  }
                >
                  <div className="message-avatar">{m.role === "user" ? "You" : "AI"}</div>

                  <div className="message-bubble">
                    <div className="msg-content" dir={rtl ? "rtl" : "ltr"}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>

                    {m.role === "assistant" && (
                      <div className="msg-actions">
                        {planId === "assistant" && isGuest ? (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            Register to copy/share and attach files
                          </span>
                        ) : planId === "assistant" && !isGuest ? (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            Upgrade to copy, share and attach files
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="msg-action-btn"
                              onClick={async () => {
                                const ok = await copyAsHtml(m.content);
                                if (!ok) alert("Copy failed on this browser.");
                              }}
                              aria-label="Copy"
                              title="Copy"
                            >
                              📋 Copy
                            </button>

                            <button
                              type="button"
                              className="msg-action-btn"
                              onClick={async () => {
                                const ok = await nativeShareHtml(m.content);
                                if (ok) return;
                                setOpenShareFor((prev) => (prev === m.id ? null : m.id));
                              }}
                              aria-label="Share"
                              title="Share"
                            >
                              🔗 Share
                            </button>

                            {openShareFor === m.id && (
                              <div
                                style={{
                                  marginTop: 6,
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  paddingLeft: 8,
                                }}
                              >
                                <button type="button" className="msg-action-btn" onClick={() => saveHtml(m.content)}>
                                  Save HTML
                                </button>
                                <button type="button" className="msg-action-btn" onClick={() => printHtml(m.content)}>
                                  Print
                                </button>
                                <button type="button" className="msg-action-btn" onClick={() => pdfHtml(m.content)}>
                                  PDF
                                </button>
                                <button type="button" className="msg-action-btn" onClick={() => setOpenShareFor(null)}>
                                  ✕ Close
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="composer">
          <div className="composer-box">
            {attachments.length > 0 && (
              <div className="attachments">
                {attachments.map((a) => (
                  <div key={a.id} className="attachment-pill">
                    {a.type === "image" ? "🖼️" : "📄"}{" "}
                    <span className="attachment-name">{a.name}</span>
                    <button className="attachment-remove" onClick={() => removeAttachment(a.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="chat-input-row">
              <div className="chat-input-left">
                <button
                  type="button"
                  className="chat-input-icon-btn"
                  aria-label="Add attachments"
                  onClick={() => {
                    if (!attachmentsAllowed) {
                      if (isGuest) openRegisterGate("Subscribe to Attach photos or documents.");
                      else openUpgradeGate("Subscribe to Attach photos or documents.");
                      return;
                    }
                    setIsAttachMenuOpen((v) => !v);
                  }}
                >
                  <span className="chat-input-plus">+</span>
                </button>

                {isAttachMenuOpen && attachmentsAllowed && (
                  <div className="attach-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachMenuOpen(false);
                        document.getElementById("image-upload")?.click();
                      }}
                    >
                      📷 Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachMenuOpen(false);
                        document.getElementById("file-upload")?.click();
                      }}
                    >
                      📄 Document
                    </button>
                  </div>
                )}
              </div>

              <textarea
                className="textarea"
                placeholder="Ask an engineering question…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "45px";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                onKeyDown={onKeyDown}
              />

              <button
                type="button"
                className="chat-input-send-btn"
                disabled={sending || (!input.trim() && attachments.length === 0)}
                onClick={send}
                aria-label="Send message"
              >
                ➤
              </button>
            </div>

            <input
              type="file"
              id="image-upload"
              accept="image/*"
              hidden
              onChange={handleImageChange}
              disabled={!attachmentsAllowed}
            />
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mpp,.dwg,.dxf,.m,.mat,.slx,.sldprt,.sldasm,.step,.stp,.iges,.inp"
              hidden
              onChange={handleFileChange}
              disabled={!attachmentsAllowed}
            />
          </div>
        </div>

        {/* Gate modal */}
        {showGate && (
          <div className="gate-overlay" role="dialog" aria-modal="true">
            <div className="gate-modal">
              <div className="gate-title">
                {gateMode === "register" ? "Register / Login required" : "Upgrade required"}
              </div>

              {limitNotice && <div className="gate-note">{limitNotice}</div>}

              {gateMode === "register" ? (
                <div className="gate-body">
                  <div className="gate-text">
                    Please register or login to continue.
                  </div>
                  <div className="gate-actions">
                    <a className="gate-btn" href="/login">Login</a>
                    <a className="gate-btn gate-btn-primary" href="/register">Register</a>
                    <button className="gate-btn" type="button" onClick={() => setShowGate(false)}>
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="gate-body">
                  <div className="gate-text">
                    Upgrade to continue without limits.
                  </div>
                  <div className="gate-actions">
                    <a className="gate-btn gate-btn-primary" href="/subscription">Upgrade</a>
                    <button className="gate-btn" type="button" onClick={() => setShowGate(false)}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
