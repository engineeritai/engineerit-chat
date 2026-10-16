"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  advisorTemplate,
  exportCapabilities,
  getAdvisor,
  hasAdvisorAccess,
  type AdvisorId,
} from "@/lib/advisors";
import {
  copyAsHtml,
  exportPdf,
  exportPptx,
  exportWordDocx,
  getLocalCount,
  isArabicText,
  nativeShareHtml,
  printHtml,
  saveHtml,
  setLocalCount,
  shareToWhatsApp,
  todayUTCKey,
} from "@/lib/chatActions";
import { useMessages } from "@/lib/useMessages";
import { useSubscriptionTier } from "@/lib/useSubscriptionTier";
import UpgradeDialog from "./UpgradeDialog";

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

function uuid() {
  return Math.random().toString(36).slice(2);
}

export default function AdvisorChat({ advisorId }: { advisorId: AdvisorId }) {
  const advisor = getAdvisor(advisorId);
  const { locale, m, dir } = useMessages();
  const { ready, isGuest, userId, tier } = useSubscriptionTier();
  const copy = m.advisors.items[advisorId];
  const unlocked = ready && !!advisor && hasAdvisorAccess(tier, advisorId, isGuest);
  const showLocked = ready && !unlocked;
  const exports = exportCapabilities(tier, isGuest);
  const filename = `engineerit-${advisorId}`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [openShareFor, setOpenShareFor] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [gateNotice, setGateNotice] = useState<string | null>(null);

  if (!advisor) return null;

  const template = advisorTemplate(advisor, locale);

  function openGate(notice?: string) {
    setGateNotice(notice || (isGuest ? m.gating.lockedBody : m.gating.sendLocked));
    setShowGate(true);
  }

  function checkDailyLimit() {
    const day = todayUTCKey();
    const planKey = isGuest ? "guest" : tier;
    const key = `engineerit_daily_${planKey}_${day}`;
    const cur = getLocalCount(key);
    const max = isGuest ? 1 : tier === "assistant" ? 3 : Number.POSITIVE_INFINITY;
    if (Number.isFinite(max) && cur >= max) {
      openGate(
        isGuest
          ? "Daily limit reached. Please register or log in."
          : "Daily limit reached. Please upgrade."
      );
      return { ok: false as const, key, cur };
    }
    return { ok: true as const, key, cur };
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!unlocked) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachments((prev) => [
        ...prev,
        { id: uuid(), name: file.name, type: "image", url: reader.result as string, file },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!unlocked) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttachments((prev) => [
      ...prev,
      { id: uuid(), name: file.name, type: "file", url, file },
    ]);
    e.target.value = "";
  };

  async function analyzeImage(question: string, imageFile: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", imageFile, imageFile.name);
    formData.append("question", question || "Analyze this project image.");
    formData.append("advisorId", advisorId);
    formData.append("planId", isGuest ? "guest" : tier);
    formData.append("locale", locale);
    const res = await fetch("/api/image", { method: "POST", body: formData });
    if (res.status === 403) {
      openGate();
      throw new Error("locked");
    }
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  async function analyzeDocument(question: string, docFile: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", docFile, docFile.name);
    formData.append("question", question || "Review this project file.");
    formData.append("advisorId", advisorId);
    formData.append("planId", isGuest ? "guest" : tier);
    formData.append("locale", locale);
    const res = await fetch("/api/document", { method: "POST", body: formData });
    if (res.status === 403) {
      openGate();
      throw new Error("locked");
    }
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  async function send() {
    if (sending || !ready) return;
    if (!unlocked) {
      openGate();
      return;
    }
    if (!input.trim() && attachments.length === 0) return;

    const check = checkDailyLimit();
    if (!check.ok) return;

    const userText = input.trim();
    const userAttachments = attachments;
    setInput("");
    setAttachments([]);
    setAttachOpen(false);

    const history = messages;
    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: "user",
        content: userText || "[Attachment-only message]",
        attachments: userAttachments,
      },
    ]);
    setSending(true);

    try {
      const docAttachment = userAttachments.find((a) => a.type === "file" && a.file);
      const imgAttachment = userAttachments.find((a) => a.type === "image" && a.file);
      let reply = "";

      if (docAttachment?.file) {
        reply = await analyzeDocument(userText, docAttachment.file);
      } else if (imgAttachment?.file) {
        reply = await analyzeImage(userText, imgAttachment.file);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discipline: copy.name,
            messages: history.concat({ id: "temp", role: "user" as const, content: userText }),
            planId: isGuest ? "guest" : tier,
            userId,
            advisorId,
            locale,
          }),
        });

        if (res.status === 403) {
          openGate();
          return;
        }
        if (res.status === 429) {
          const data = await res.json().catch(() => null);
          openGate(data?.error);
          setMessages((prev) => [
            ...prev,
            {
              id: uuid(),
              role: "assistant",
              content: data?.error || m.gating.sendLocked,
            },
          ]);
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { reply: string };
        reply = data.reply || "";
      }

      setMessages((prev) => [...prev, { id: uuid(), role: "assistant", content: reply }]);
      setLocalCount(check.key, check.cur + 1);
    } catch (err) {
      if (err instanceof Error && err.message === "locked") return;
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: uuid(), role: "assistant", content: "Sorry, something failed. Please try again." },
      ]);
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
    <div className="advisor-chat" dir={dir}>
      <div className="advisor-chat-intro">
        <div className="advisor-breadcrumb">
          <Link href="/">engineerit AI</Link>
          <span aria-hidden="true">›</span>
          <Link href="/advisors">{m.advisors.sectionTitle}</Link>
          <span aria-hidden="true">›</span>
          <span>{copy.track}</span>
        </div>
        <div className="advisor-chat-heading">
          <h1 className="page-title">{copy.name}</h1>
          {ready && (
            <span className={unlocked ? "advisor-badge advisor-badge-on" : "advisor-badge"}>
              {unlocked ? m.advisors.includedBadge : m.advisors.lockedBadge}
            </span>
          )}
        </div>
        <p className="page-subtitle">{copy.summary}</p>

        {showLocked && (
          <div className="advisor-lock-banner">
            <div>
              <div className="advisor-lock-title">{m.gating.lockedTitle}</div>
              <p>{m.gating.lockedBody}</p>
            </div>
            <div className="gate-actions">
              {isGuest ? (
                <a className="gate-btn gate-btn-primary" href="/register">
                  {m.gating.registerCta}
                </a>
              ) : (
                <a className="gate-btn gate-btn-primary" href="/subscription">
                  {m.gating.upgradeCta}
                </a>
              )}
              <a className="gate-btn" href="/pricing">
                {m.gating.compareCta}
              </a>
            </div>
          </div>
        )}

        <div className="advisor-split">
          <div>
            <h2 className="section-heading">{m.advisors.capabilitiesTitle}</h2>
            <ul className="advisor-capabilities">
              {copy.capabilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2 className="section-heading">{m.advisors.startersTitle}</h2>
            <div className="advisor-starters">
              {copy.starters.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="advisor-starter"
                  onClick={() => {
                    if (!unlocked) {
                      openGate();
                      return;
                    }
                    setInput(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <details className="advisor-template" open>
            <summary>{m.advisors.outputTemplate}</summary>
            <pre>{template.trim()}</pre>
          </details>
        </div>
      </div>

      <div className="conversation advisor-conversation">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>{showLocked ? m.gating.lockedBody : m.advisors.emptyState}</p>
          </div>
        ) : (
          messages.map((message) => {
            const rtl = isArabicText(message.content);
            return (
              <div
                key={message.id}
                className={
                  "message-row " +
                  (message.role === "user" ? "message-user" : "message-assistant")
                }
              >
                <div className="message-avatar">{message.role === "user" ? "You" : "AI"}</div>
                <div className="message-bubble">
                  <div className="msg-content" dir={rtl ? "rtl" : "ltr"}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                  {(message.attachments?.length || 0) > 0 && (
                    <div className="advisor-attachment-list">
                      {message.attachments!.map((file) => (
                        <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
                          {file.type === "image" ? "🖼️" : "📄"} {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  {message.role === "assistant" && exports.copyShare && (
                    <div className="msg-actions">
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={async () => {
                          const ok = await copyAsHtml(message.content);
                          if (!ok) alert("Copy failed on this browser.");
                        }}
                      >
                        📋 Copy
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={async () => {
                          const ok = await nativeShareHtml(message.content, filename);
                          if (ok) return;
                          setOpenShareFor((prev) => (prev === message.id ? null : message.id));
                        }}
                      >
                        🔗 Share
                      </button>
                      {exports.pdf && (
                        <button
                          type="button"
                          className="msg-action-btn"
                          onClick={async () => {
                            try {
                              await exportPdf(message.content, filename);
                            } catch (err) {
                              console.error(err);
                              alert("PDF export failed. Please try again.");
                            }
                          }}
                        >
                          📄 PDF
                        </button>
                      )}
                      {exports.wordPpt && (
                        <>
                          <button
                            type="button"
                            className="msg-action-btn"
                            onClick={async () => {
                              try {
                                await exportWordDocx(message.content, filename);
                              } catch (err) {
                                console.error(err);
                                alert("Word export failed. Please try again.");
                              }
                            }}
                          >
                            📝 Word
                          </button>
                          <button
                            type="button"
                            className="msg-action-btn"
                            onClick={async () => {
                              try {
                                await exportPptx(message.content, filename);
                              } catch (err) {
                                console.error(err);
                                alert("PowerPoint export failed. Please try again.");
                              }
                            }}
                          >
                            📊 PPT
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {openShareFor === message.id && (
                    <div className="advisor-share-extra">
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => saveHtml(message.content, filename)}
                      >
                        Save HTML
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => printHtml(message.content, filename)}
                      >
                        Print
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => shareToWhatsApp(message.content)}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => setOpenShareFor(null)}
                      >
                        ✕ Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="composer">
        <div className={"composer-box" + (unlocked ? "" : " advisor-composer-locked")}>
          {attachments.length > 0 && (
            <div className="attachments">
              {attachments.map((file) => (
                <div key={file.id} className="attachment-pill">
                  {file.type === "image" ? "🖼️" : "📄"}{" "}
                  <span className="attachment-name">{file.name}</span>
                  <button
                    className="attachment-remove"
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== file.id))}
                  >
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
                  if (!unlocked) {
                    openGate();
                    return;
                  }
                  setAttachOpen((v) => !v);
                }}
              >
                <span className="chat-input-plus">+</span>
              </button>
              {attachOpen && unlocked && (
                <div className="attach-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachOpen(false);
                      document.getElementById("advisor-image-upload")?.click();
                    }}
                  >
                    📷 Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachOpen(false);
                      document.getElementById("advisor-file-upload")?.click();
                    }}
                  >
                    📄 Document
                  </button>
                </div>
              )}
            </div>

            <textarea
              className="textarea"
              placeholder={
                showLocked ? m.gating.sendLocked : m.advisors.askPlaceholder
              }
              value={input}
              disabled={!unlocked}
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
              disabled={unlocked && (sending || (!input.trim() && attachments.length === 0))}
              onClick={() => void send()}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>

          <input
            type="file"
            id="advisor-image-upload"
            accept="image/*"
            hidden
            onChange={handleImageChange}
            disabled={!unlocked}
          />
          <input
            type="file"
            id="advisor-file-upload"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mpp,.dwg,.dxf"
            hidden
            onChange={handleFileChange}
            disabled={!unlocked}
          />
        </div>
      </div>

      <UpgradeDialog
        open={showGate}
        isGuest={isGuest}
        m={m}
        notice={gateNotice}
        onClose={() => setShowGate(false)}
      />
    </div>
  );
}
