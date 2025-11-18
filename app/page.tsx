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

type Role = "user" | "assistant";

type Attachment = {
  id: string;
  name: string;
  type: "image" | "file";
  url: string;
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

function uuid() {
  return Math.random().toString(36).slice(2);
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

  // "+" attach mini menu
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  // TODO: later link this to real Supabase profile.plan === "engineer"
  const isEngineerPlan = true;

  // ---------- threads ----------

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

  // ---------- attachments ----------

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

  // ---------- voice ----------

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

  // ---------- helpers: image / document ----------

  async function analyzeImage(question: string, imageFile: File): Promise<string> {
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

  // ---------- Engineer tools helpers ----------

  function insertTemplate(template: string) {
    setInput((prev) => (prev ? `${prev}\n\n${template}` : template));
  }

  // ---------- send ----------

  async function send() {
    if (!thread || (!input.trim() && attachments.length === 0) || sending)
      return;

    const userText = input.trim();
    const userAttachments = attachments;
    setInput("");
    setAttachments([]);
    setIsAttachMenuOpen(false);

    // Add user message
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

  // ---------- render ----------

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

        {/* Engineer plan tools bar */}
        {isEngineerPlan && (
          <div className="engineer-tools">
            <span className="engineer-tools-label">Engineer tools:</span>
            <button
              type="button"
              className="engineer-tools-btn"
              onClick={() =>
                insertTemplate(
                  "Generate a detailed engineering technical report, ready to paste into Word, in Arabic and English. Include clear headings: 1) Project Information, 2) Objectives, 3) Methodology, 4) Calculations (summary), 5) Results, 6) Engineering Assessment, 7) Recommendations, 8) Assumptions and limitations. The topic is: [describe project here]."
                )
              }
            >
              Word: Technical Report
            </button>
            <button
              type="button"
              className="engineer-tools-btn"
              onClick={() =>
                insertTemplate(
                  "Create an engineering calculation sheet structure suitable for Excel. Use a clear table layout with column headers, formulas description, and units. Sections: Inputs, Assumptions, Step-by-step Calculations, Output Summary, and Checks. The calculation is for: [describe calculation here]. Format the answer so it is easy to copy into Excel."
                )
              }
            >
              Excel: Calculation Sheet
            </button>
            <button
              type="button"
              className="engineer-tools-btn"
              onClick={() =>
                insertTemplate(
                  "Create a professional engineering PowerPoint outline in bullet points. Slides: 1) Title & Project Info, 2) Background & Objectives, 3) Methodology, 4) Key Data / Calculations (high level), 5) Results, 6) Risks & Mitigations, 7) Recommendations, 8) Next Steps. The project is: [describe project here]. Provide slide-by-slide bullet points, ready to paste into PowerPoint."
                )
              }
            >
              PowerPoint: Presentation Outline
            </button>
          </div>
        )}

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

        {/* ChatGPT-like composer */}
        <div className="composer">
          <div className="composer-box">
            {/* attachments pills */}
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

            {/* main input row */}
            <div className="chat-input-row">
              {/* LEFT: + with mini menu */}
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

              {/* CENTER: textarea */}
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

              {/* RIGHT: mic + send */}
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
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              hidden
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
