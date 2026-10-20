"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import ComposerPlus from "@/app/components/ComposerPlus";
import EitMark from "@/app/components/marketing/EitMark";
import { DaySeparator, MessageTime, useMessageTimeZone } from "@/app/components/MessageTime";
import { formatDaySeparator } from "@/lib/messageTime";
import { applyComposerHeight, resetComposerHeight } from "@/lib/fitComposer";
import MessageMarkdown from "@/app/components/MessageMarkdown";
import { collectDiagramPngs, copyRichElement } from "@/app/components/copyRich";
import { saveWasToasted } from "@/lib/saveFile";
import { showToast } from "@/lib/toast";
import { exportMeta } from "@/lib/messageDocument";
import {
  exportCapabilities,
  getAdvisor,
  hasAdvisorAccess,
  unlockPlanForAdvisor,
  type AdvisorId,
} from "@/lib/advisors";
import BuyPlanButton from "@/app/components/BuyPlanButton";
import { advisorsAreLive, advisorsNowLive } from "@/lib/advisorLaunch";
import { getAccessToken } from "@/lib/accessToken";
import { getPlaybook, groupedPlaybooks, playbooksFor, playbookTemplate } from "@/lib/playbooks";
import {
  exportPdf,
  exportPptx,
  exportWordDocx,
  getLocalCount,
  isArabicText,
  printHtml,
  publishAndShare,
  publishShare,
  saveHtml,
  setLocalCount,
  shareToWhatsApp,
  todayUTCKey,
} from "@/lib/chatActions";
import { useMessages } from "@/lib/useMessages";
import { useSubscriptionTier } from "@/lib/useSubscriptionTier";
import { postDocument, postImage, readApiError } from "@/lib/postAttachment";
import { MAX_UPLOAD_BYTES, UploadError, fileTooLargeMessage } from "@/lib/uploadLimits";
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
  createdAt?: string;
};

function uuid() {
  return Math.random().toString(36).slice(2);
}

export default function AdvisorChat({ advisorId }: { advisorId: AdvisorId }) {
  const advisor = getAdvisor(advisorId);
  const { locale, m, dir, shell: s } = useMessages();
  const timeZone = useMessageTimeZone();
  const { ready, isGuest, userId, tier } = useSubscriptionTier();
  const copy = m.advisors.items[advisorId];
  const live = advisorsAreLive();
  const nowLive = advisorsNowLive();
  const entitled = ready && !!advisor && hasAdvisorAccess(tier, advisorId, isGuest);
  const unlocked = live && entitled;
  const showLocked = live && ready && !entitled;
  const showPilot = live && ready && (isGuest || !entitled);
  const exports = exportCapabilities(tier, isGuest);
  const playbooks = advisor ? playbooksFor(advisor.id) : [];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const onResize = () => {
      const el = composerRef.current;
      if (el) applyComposerHeight(el);
    };
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  const [attachOpen, setAttachOpen] = useState(false);
  const [openShareFor, setOpenShareFor] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [gateNotice, setGateNotice] = useState<string | null>(null);
  const [activePlaybook, setActivePlaybook] = useState(playbooks[0]?.id ?? "");
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  if (!advisor) return null;

  const selected = getPlaybook(advisor.id, activePlaybook) ?? playbooks[0];
  const template = selected ? playbookTemplate(selected, locale) : "";

  function openGate(notice?: string) {
    setGateNotice(notice || m.advisors.includedOn[advisorId]);
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
        isGuest ? s.chat.dailyGuest : s.chat.dailyPaid
      );
      return { ok: false as const, key, cur };
    }
    return { ok: true as const, key, cur };
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!unlocked) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadNotice(fileTooLargeMessage(locale));
      e.target.value = "";
      return;
    }
    setUploadNotice(null);
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
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadNotice(fileTooLargeMessage(locale));
      e.target.value = "";
      return;
    }
    setUploadNotice(null);
    const url = URL.createObjectURL(file);
    setAttachments((prev) => [
      ...prev,
      { id: uuid(), name: file.name, type: "file", url, file },
    ]);
    e.target.value = "";
  };

  async function authHeaders(extra?: HeadersInit): Promise<Headers> {
    const headers = new Headers(extra);
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  function openLocked(code?: string): never {
    openGate(code === "coming_soon" ? m.advisors.comingSoonBody : undefined);
    throw new Error("locked");
  }

  async function analyzeImage(question: string, imageFile: File, playbookId: string): Promise<string> {
    let res: Response;
    try {
      res = await postImage({
        file: imageFile,
        question: question || (locale === "ar" ? "حلل صورة المشروع هذه." : "Analyze this project image."),
        headers: await authHeaders(),
        advisorId,
        locale,
        playbookId,
      });
    } catch (err) {
      if (err instanceof UploadError && err.status === 403) openLocked(err.code);
      throw err;
    }
    if (res.status === 403) {
      const failure = await readApiError(res);
      openLocked(failure.code);
    }
    if (!res.ok) {
      const failure = await readApiError(res);
      throw new UploadError(
        failure.message || s.chat.imageFailed,
        res.status,
        failure.code
      );
    }
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  async function analyzeDocument(question: string, docFile: File, playbookId: string): Promise<string> {
    let res: Response;
    try {
      res = await postDocument({
        file: docFile,
        question: question || (locale === "ar" ? "راجع ملف المشروع هذا." : "Review this project file."),
        headers: await authHeaders(),
        advisorId,
        locale,
        playbookId,
      });
    } catch (err) {
      if (err instanceof UploadError && err.status === 403) openLocked(err.code);
      throw err;
    }
    if (res.status === 403) {
      const failure = await readApiError(res);
      openLocked(failure.code);
    }
    if (!res.ok) {
      const failure = await readApiError(res);
      throw new UploadError(
        failure.message ||
          s.chat.documentFailed,
        res.status,
        failure.code
      );
    }
    const data = (await res.json()) as { reply: string };
    return data.reply || "";
  }

  async function submit(text: string, playbookId: string) {
    if (sendingRef.current || !ready) return;
    if (!live) {
      openGate(m.advisors.comingSoonBody);
      return;
    }
    if (!unlocked) {
      openGate();
      return;
    }
    const userText = text.trim();
    if (!userText && attachments.length === 0) return;

    const check = checkDailyLimit();
    if (!check.ok) return;

    const userAttachments = attachments;
    setInput("");
    resetComposerHeight(composerRef.current);
    setAttachments([]);
    setAttachOpen(false);
    if (playbookId) setActivePlaybook(playbookId);

    const history = messages;
    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: "user",
        content: userText || "[Attachment-only message]",
        attachments: userAttachments,
        createdAt: new Date().toISOString(),
      },
    ]);
    sendingRef.current = true;
    setSending(true);

    try {
      const docAttachment = userAttachments.find((a) => a.type === "file" && a.file);
      const imgAttachment = userAttachments.find((a) => a.type === "image" && a.file);
      let reply = "";

      if (docAttachment?.file) {
        reply = await analyzeDocument(userText, docAttachment.file, playbookId);
      } else if (imgAttachment?.file) {
        reply = await analyzeImage(userText, imgAttachment.file, playbookId);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: await authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            discipline: copy.name,
            messages: history.concat({
              id: "temp",
              role: "user" as const,
              content: userText,
            }),
            planId: isGuest ? "guest" : tier,
            userId,
            advisorId,
            locale,
            playbookId,
          }),
        });

        if (res.status === 403) {
          const data = await res.json().catch(() => null);
          openGate(data?.code === "coming_soon" ? m.advisors.comingSoonBody : undefined);
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
              createdAt: new Date().toISOString(),
            },
          ]);
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { reply: string };
        reply = data.reply || "";
      }

      setMessages((prev) => [...prev, { id: uuid(), role: "assistant", content: reply, createdAt: new Date().toISOString() }]);
      setLocalCount(check.key, check.cur + 1);
    } catch (err) {
      if (err instanceof Error && err.message === "locked") return;
      console.error(err);
      const content =
        err instanceof UploadError
          ? err.message
          : s.chat.sorry;
      setMessages((prev) => [...prev, { id: uuid(), role: "assistant", content, createdAt: new Date().toISOString() }]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(input, activePlaybook);
    }
  }

  return (
    <div className="advisor-chat" dir={dir}>
      <div className="advisor-chat-intro">
        <div className="advisor-breadcrumb">
          <Link href="/">{m.advisors.ecosystemAi}</Link>
          <span aria-hidden="true">›</span>
          <Link href="/advisors">{m.advisors.sectionTitle}</Link>
          <span aria-hidden="true">›</span>
          <span>{copy.track}</span>
        </div>
        <div className="advisor-chat-heading">
          <h1 className="page-title">{copy.name}</h1>
          {!live && (
            <span className="advisor-badge advisor-badge-soon">{m.advisors.comingSoonBadge}</span>
          )}
          {nowLive && (
            <span className="advisor-badge advisor-badge-on">{m.advisors.nowLiveBadge}</span>
          )}
          {ready && live && (
            <span className={unlocked ? "advisor-badge advisor-badge-on" : "advisor-badge"}>
              {unlocked ? m.advisors.includedBadge : m.advisors.lockedBadge}
            </span>
          )}
        </div>
        <p className="page-subtitle">{copy.summary}</p>

        {!live && (
          <div className="advisor-launch-banner">
            <span className="advisor-badge advisor-badge-soon">{m.advisors.comingSoonBadge}</span>
            <p>{m.advisors.comingSoonBody}</p>
          </div>
        )}

        {showLocked && (
          <div className="advisor-lock-banner">
            <div>
              <div className="advisor-lock-title">{m.advisors.includedOn[advisorId]}</div>
              <p>{copy.summary}</p>
            </div>
            <div className="gate-actions">
              <BuyPlanButton
                planId={unlockPlanForAdvisor(advisorId)}
                interval="month"
                verb="upgrade"
                className="gate-btn gate-btn-primary"
              />
              <a className="gate-btn" href="/pricing">
                {m.gating.compareCta}
              </a>
            </div>
          </div>
        )}

        {showPilot && <p className="advisor-pilot">{m.gating.pilotNote}</p>}

        <div className="advisor-split">
          <div>
            <h2 className="section-heading">{m.advisors.capabilitiesTitle}</h2>
            <ul className="advisor-capabilities">
              {(showLocked ? copy.capabilities.slice(0, 2) : copy.capabilities).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {showLocked ? null : (
            <>
            <h2 className="section-heading">{m.advisors.playbooksTitle}</h2>
            <p className="advisor-playbook-hint">{m.advisors.playbookHint}</p>
            {groupedPlaybooks(advisor.id).map((group) => (
              <div key={group.group ?? "all"} className="advisor-playbook-group">
                {group.group ? (
                  <h3 className="advisor-playbook-group-title">
                    {m.advisors.playbookGroups[group.group]}
                  </h3>
                ) : null}
                <div className="advisor-starters">
                  {group.playbooks.map((playbook) => {
                    const label = copy.playbooks[playbook.id];
                    if (!label) return null;
                    const active = selected?.id === playbook.id;
                    return (
                      <button
                        key={playbook.id}
                        type="button"
                        className={"advisor-starter" + (active ? " advisor-starter-active" : "")}
                        disabled={sending}
                        onClick={() => {
                          setActivePlaybook(playbook.id);
                          if (!live) {
                            openGate(m.advisors.comingSoonBody);
                            return;
                          }
                          if (!unlocked) {
                            openGate();
                            return;
                          }
                          void submit(
                            m.advisors.playbookRun.replace("{name}", label.name),
                            playbook.id
                          );
                        }}
                      >
                        <span className="advisor-playbook-name">{label.name}</span>
                        <span className="advisor-playbook-outcome">{label.outcome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            </>
            )}
          </div>
          {showLocked ? null : (
          <details className="advisor-template" open>
            <summary>
              {m.advisors.outputTemplate}
              {selected ? `: ${copy.playbooks[selected.id]?.name ?? ""}` : ""}
            </summary>
            <pre>{template.trim()}</pre>
          </details>
          )}
        </div>
        <p className="advisor-responsibility">{m.advisors.responsibility}</p>
      </div>

      <div className="conversation advisor-conversation">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>
              {!live
                ? m.advisors.comingSoonBody
                : showLocked
                  ? m.gating.lockedBody
                  : m.advisors.emptyState}
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const rtl = isArabicText(message.content);
            const dayLabel = formatDaySeparator(message.createdAt, locale, new Date(), timeZone);
            const previous = messages[index - 1];
            const previousDay = previous
              ? formatDaySeparator(previous.createdAt, locale, new Date(), timeZone)
              : null;
            const meta = exportMeta(message.content, undefined, locale, messages.find((item) => item.role === "user")?.content);
            const topic = meta.title;
            return (
              <div key={message.id}>
                {dayLabel && dayLabel !== previousDay ? <DaySeparator label={dayLabel} /> : null}
              <div
                className={
                  "message-row " +
                  (message.role === "user" ? "message-user" : "message-assistant")
                }
              >
                {message.role === "user" ? (
                  <div className="message-avatar">{s.chat.you}</div>
                ) : (
                  <div className="message-avatar message-avatar-mark">
                    <EitMark size={32} plate="circle" title="eit" />
                  </div>
                )}
                <div className="message-bubble">
                  <MessageTime iso={message.createdAt} locale={locale} zone={timeZone} />
                  <div className="msg-content" dir={rtl ? "rtl" : "ltr"} data-message-id={message.id}>
                    <MessageMarkdown
                      markdown={message.content}
                      dir={rtl ? "rtl" : "ltr"}
                      locale={locale}
                      fileBase={topic}
                      labels={{
                        copyTable: s.chat.copyTable,
                        exportExcel: s.chat.exportExcel,
                        diagramCopy: s.chat.diagramCopy,
                        diagramPng: s.chat.diagramPng,
                        diagramSvg: s.chat.diagramSvg,
                      }}
                    />
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
                          const root = document.querySelector<HTMLElement>(`[data-message-id="${message.id}"]`);
                          if (!root) showToast(s.chat.copyFailed, "err");
                          else await copyRichElement(root, message.content);
                        }}
                      >
                        📋 Copy
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={async () => {
                          const { url, shared } = await publishAndShare({ title: topic, markdown: message.content, locale });
                          if (!url) {
                            showToast(s.chat.shareFailed, "err");
                            return;
                          }
                          if (shared) return;
                          try {
                            await navigator.clipboard.writeText(url);
                          } catch {
                            /* the menu still offers WhatsApp */
                          }
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
                              const root = document.querySelector<HTMLElement>(`[data-message-id="${message.id}"]`);
                              const diagrams = root ? await collectDiagramPngs(root) : [];
                              await exportPdf(message.content, meta.source || topic, { title: meta.source || topic, subtitle: meta.subtitle, locale, diagrams });
                            } catch (err) {
                              console.error(err);
                              if (!saveWasToasted(err)) showToast(s.chat.pdfFailed, "err");
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
                                const root = document.querySelector<HTMLElement>(`[data-message-id="${message.id}"]`);
                                const diagrams = root ? await collectDiagramPngs(root) : [];
                                await exportWordDocx(message.content, meta.source || topic, { title: meta.source || topic, subtitle: meta.subtitle, locale, diagrams });
                              } catch (err) {
                                console.error(err);
                                if (!saveWasToasted(err)) showToast(s.chat.wordFailed, "err");
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
                                const root = document.querySelector<HTMLElement>(`[data-message-id="${message.id}"]`);
                                const diagrams = root ? await collectDiagramPngs(root) : [];
                                await exportPptx(message.content, meta.source || topic, { title: meta.source || topic, subtitle: meta.subtitle, locale, diagrams });
                              } catch (err) {
                                console.error(err);
                                if (!saveWasToasted(err)) showToast(s.chat.pptFailed, "err");
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
                        onClick={() => saveHtml(message.content, topic, locale)}
                      >
                        Save HTML
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => printHtml(message.content, topic, locale)}
                      >
                        Print
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={async () => {
                          const url = await publishShare({ title: topic, markdown: message.content, locale });
                          if (!url) {
                            showToast(s.chat.shareFailed, "err");
                            return;
                          }
                          shareToWhatsApp(message.content, url);
                        }}
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
              </div>
            );
          })
        )}
      </div>

      <div className="composer">
        <div className={"composer-box" + (unlocked ? "" : " advisor-composer-locked")}>
          {uploadNotice && (
            <div className="upload-notice" role="alert">
              {uploadNotice}
            </div>
          )}
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
                className="chat-input-icon-btn is-plus"
                aria-label="Add attachments"
                onClick={() => {
                  if (!unlocked) {
                    openGate();
                    return;
                  }
                  setAttachOpen((v) => !v);
                }}
              >
                <ComposerPlus />
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
              ref={composerRef}
              className="textarea"
              rows={1}
              placeholder={
                !live
                  ? m.advisors.comingSoonBody
                  : showLocked
                    ? m.gating.sendLocked
                    : m.advisors.askPlaceholder
              }
              value={input}
              disabled={!unlocked}
              onChange={(e) => {
                setInput(e.target.value);
                applyComposerHeight(e.target);
              }}
              onKeyDown={onKeyDown}
            />

            <button
              type="button"
              className="chat-input-send-btn"
              disabled={unlocked && (sending || (!input.trim() && attachments.length === 0))}
              onClick={() => void submit(input, activePlaybook)}
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
        planId={unlockPlanForAdvisor(advisorId)}
        onClose={() => setShowGate(false)}
      />
    </div>
  );
}
