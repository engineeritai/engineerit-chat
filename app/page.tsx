"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
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

/**
 * صلاحيات الأدوات حسب نوع الاشتراك:
 * - Assistant: الكل مقفول (إعلان للترقية فقط)
 * - Engineer: Drawing + Design
 * - Professional: كل أدوات Engineer + ITP & QA/QC + BOQ & Quantities
 * - Consultant: كل ما سبق + Schedule & Resources + Value Engineering + Project Dashboards
 */
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

export default function Page() {
  const [discipline, setDiscipline] = useState("General");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // voice
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // "+" mini attach menu
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  // plan (لربط الأدوات بالاشتراك)
  const [planId, setPlanId] = useState<PlanId>("assistant");

  // mobile tools dropdown
  const [showMobileTools, setShowMobileTools] = useState(false);

  // landing post (one-time per browser)
  const [showLanding, setShowLanding] = useState(false);

  /* ======================
     Load user plan (Supabase)
     ====================== */

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setPlanId("assistant");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && profile?.plan) {
          const p = profile.plan as PlanId;
          if (
            p === "assistant" ||
            p === "engineer" ||
            p === "professional" ||
            p === "consultant"
          ) {
            setPlanId(p);
          } else {
            setPlanId("assistant");
          }
        } else {
          setPlanId("assistant");
        }
      } catch (err) {
        console.error("Failed to load plan for engineer tools", err);
        setPlanId("assistant");
      }
    };

    void loadPlan();
  }, []);

  /* ======================
     Landing post visibility
     ====================== */

  useEffect(() => {
    try {
      const KEY = "engineerit_landing_seen_v1";
      if (typeof window === "undefined") return;
      const seen = window.localStorage.getItem(KEY);
      if (!seen) {
        setShowLanding(true);
      }
    } catch (err) {
      console.error("Landing localStorage error:", err);
      // لو صار خطأ، نخليها تظهر مرة واحدة في هذه الجلسة
      setShowLanding(true);
    }
  }, []);

  const handleCloseLanding = () => {
    try {
      const KEY = "engineerit_landing_seen_v1";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(KEY, "yes");
      }
    } catch {
      // ignore
    }
    setShowLanding(false);
  };

  /* ======================
     Threads management
     ====================== */

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
    setThreads((all) =>
      all.map((t) => (t.id === currentThreadId ? fn(t) : t))
    );
  }

  /* ======================
     Attachments
     ====================== */

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setAttachments((prev) => [
        ...prev,
        {
          id: uuid(),
          name: file.name,
          type: "image",
          url,
          file,
        },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAttachments((prev) => [
      ...prev,
      {
        id: uuid(),
        name: file.name,
        type: "file",
        url,
        file,
      },
    ]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  /* ======================
     Voice
     ====================== */

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];

        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        try {
          const res = await fetch("/api/voice", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error("Voice API error:", errText);
            alert("Transcription failed: " + errText);
            return;
          }

          const data = (await res.json()) as { text?: string };
          const text = data?.text ?? "";
          if (text) {
            setInput((prev) => (prev ? `${prev} ${text}` : text));
          }
        } catch (err) {
          console.error(err);
          alert("Voice transcription failed. Please try again.");
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Could not access microphone. Check browser permissions.");
    }
  }

  function stopRecording() {
    setIsRecording(false);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  /* ======================
     Helper APIs: image / document
     ====================== */

  async function analyzeImage(
    question: string,
    imageFile: File
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", imageFile, imageFile.name);
    formData.append(
      "question",
      question ||
        "Please analyze this engineering image and explain it with headings and bullet points."
    );

    const res = await fetch("/api/image", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Image request failed: ${res.status}`);
    }

    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  async function analyzeDocument(
    question: string,
    docFile: File
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", docFile, docFile.name);
    formData.append(
      "question",
      question ||
        "Extract the important information from this document and summarize it for an engineer."
    );

    const res = await fetch("/api/document", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Document request failed: ${res.status}`);
    }

    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  /* ======================
     Engineer tools helpers
     ====================== */

  function insertTemplate(template: string) {
    setInput((prev) => (prev ? `${prev}\n\n${template}` : template));
  }

  const handleEngineerToolClick = (toolId: ToolId) => {
    switch (toolId) {
      case "drawing":
        insertTemplate(
          "Explain and analyze the attached engineering drawing (PFD / P&ID / block diagram). Describe the main units, flows, and key engineering notes in Arabic and English."
        );
        break;
      case "design":
        insertTemplate(
          "Check this engineering design against relevant codes and standards. List assumptions, checks, and any non-compliance items, in Arabic and English."
        );
        break;
      case "itp":
        insertTemplate(
          "Generate an Inspection & Test Plan (ITP) and QA/QC checklist for this engineering activity. Include hold points, responsible party, and acceptance criteria."
        );
        break;
      case "boq":
        insertTemplate(
          "From this project description, propose a structured Bill of Quantities (BOQ) with main items, units, and estimated quantities (if possible)."
        );
        break;
      case "schedule":
        insertTemplate(
          "Build a high-level project schedule with main activities, approximate durations, and logical sequence. Present it in a table format suitable for MS Project or Primavera."
        );
        break;
      case "value":
        insertTemplate(
          "Perform a value engineering review: suggest alternative materials, construction methods, or design optimizations to reduce cost and improve performance."
        );
        break;
      case "dashboard":
        insertTemplate(
          "Create a management-level dashboard summary for this project: key KPIs, main risks, status summary, and next actions in bullet points."
        );
        break;
      default:
        break;
    }
  };

  /* ======================
     Send message
     ====================== */

  async function send() {
    if (!thread || (!input.trim() && attachments.length === 0) || sending)
      return;

    const userText = input.trim();
    const userAttachments = attachments;
    setInput("");
    setAttachments([]);
    setIsAttachMenuOpen(false);

    // add user message
    updateThread((t) => ({
      ...t,
      title:
        t.messages.length === 0
          ? userText.slice(0, 64) || "New conversation"
          : t.title,
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
      const docAttachment = userAttachments.find(
        (a) => a.type === "file" && a.file
      );
      const imgAttachment = userAttachments.find(
        (a) => a.type === "image" && a.file
      );

      if (docAttachment) {
        const reply = await analyzeDocument(userText, docAttachment.file!);
        updateThread((t) => ({
          ...t,
          messages: [
            ...t.messages,
            {
              id: uuid(),
              role: "assistant",
              content: reply,
            },
          ],
        }));
      } else if (imgAttachment) {
        const reply = await analyzeImage(userText, imgAttachment.file!);
        updateThread((t) => ({
          ...t,
          messages: [
            ...t.messages,
            {
              id: uuid(),
              role: "assistant",
              content: reply,
            },
          ],
        }));
      } else {
        // text-only chat
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
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }

        const data = (await res.json()) as { reply: string };
        updateThread((t) => ({
          ...t,
          messages: [
            ...t.messages,
            {
              id: uuid(),
              role: "assistant",
              content: data.reply || "",
            },
          ],
        }));
      }
    } catch (e) {
      console.error(e);
      updateThread((t) => ({
        ...t,
        messages: [
          ...t.messages,
          {
            id: uuid(),
            role: "assistant",
            content:
              "Sorry, I couldn’t complete that request. Make sure your image/document/chat APIs are working.",
          },
        ],
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

  /* ======================
     Render
     ====================== */

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

        {/* Landing post (banner) */}
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
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Welcome to engineerit.ai
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  lineHeight: 1.4,
                }}
              >
                A digital AI-powered platform providing engineering intelligence services, 
                including automated engineering analysis, data processing, 
                remote technical consulting, and operating an interactive system that utilizes AI technologies 
                to analyze documents, drawings, and enhance engineering experience.
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

        {/* Engineer tools – desktop / tablet */}
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

        {/* Engineer tools – mobile dropdown */}
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
                    <div
                      key={tool.id}
                      className={
                        "engineer-tools-mobile-item" +
                        (enabled
                          ? ""
                          : " engineer-tools-mobile-item-locked")
                      }
                    >
                      <div>
                        {enabled ? "✅" : "🔒"} <span>{tool.label}</span>
                      </div>
                      {!enabled && (
                        <span className="engineer-tools-mobile-plan-hint">
                          Upgrade
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="conversation">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>Ask an engineering question to start the conversation.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  "message-row " +
                  (m.role === "user" ? "message-user" : "message-assistant")
                }
              >
                <div className="message-avatar">
                  {m.role === "user" ? "You" : "AI"}
                </div>
                <div className="message-bubble">
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="msg-attachments">
                      {m.attachments.map((a) =>
                        a.type === "image" ? (
                          <div key={a.id} className="msg-attachment">
                            <img src={a.url} alt={a.name} />
                            <span>{a.name}</span>
                          </div>
                        ) : (
                          <div key={a.id} className="msg-attachment">
                            <span>📄 {a.name}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="composer">
          <div className="composer-box">
            {attachments.length > 0 && (
              <div className="attachments">
                {attachments.map((a) => (
                  <div key={a.id} className="attachment-pill">
                    {a.type === "image" ? "🖼️" : "📄"}{" "}
                    <span className="attachment-name">{a.name}</span>
                    <button
                      className="attachment-remove"
                      onClick={() => removeAttachment(a.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="chat-input-row">
              {/* + button */}
              <div className="chat-input-left">
                <button
                  type="button"
                  className="chat-input-icon-btn"
                  aria-label="Add attachments"
                  onClick={() => setIsAttachMenuOpen((v) => !v)}
                >
                  <span className="chat-input-plus">+</span>
                </button>

                {isAttachMenuOpen && (
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachMenuOpen(false);
                        alert("Scan feature coming soon");
                      }}
                    >
                      🖨️ Scan (coming soon)
                    </button>
                  </div>
                )}
              </div>

              {/* textarea */}
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

              {/* mic */}
              <button
                type="button"
                className={
                  "chat-input-icon-btn" +
                  (isRecording ? " chat-input-icon-btn-record" : "")
                }
                title="Press and hold to talk"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              >
                🎤
              </button>

              {/* send */}
              <button
                type="button"
                className="chat-input-send-btn"
                disabled={
                  sending || (!input.trim() && attachments.length === 0)
                }
                onClick={send}
                aria-label="Send message"
              >
                ➤
              </button>
            </div>

            {/* hidden file inputs */}
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              hidden
              onChange={handleImageChange}
            />
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mpp,.dwg,.dxf,.m,.mat,.slx,.sldprt,.sldasm,.step,.stp,.iges,.inp"
              hidden
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
