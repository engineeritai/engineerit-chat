"use client";

import React, { useMemo, useState } from "react";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

type Attachment = {
  id?: string;
  name?: string;
  type?: "image" | "file";
  url?: string;
};

type Props = {
  role: "user" | "assistant";
  content: string;

  // optional: if you render attachments
  attachments?: Attachment[];

  // optional: pass these if you already have them in parent (recommended)
  planId?: PlanId; // assistant/engineer/professional/consultant
  isAuthed?: boolean; // logged-in user?
  onUpgradeClick?: () => void; // optional action
};

function isArabicText(text: string) {
  // Arabic + Persian ranges
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text || "");
}

function buildShareText(raw: string) {
  const txt = (raw || "").trim();
  if (!txt) return "engineerit.ai";
  return `${txt}\n\n— engineerit.ai`;
}

function buildWhatsAppLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildEmailLink(text: string) {
  const subject = encodeURIComponent("engineerit.ai");
  const body = encodeURIComponent(text);
  return `mailto:?subject=${subject}&body=${body}`;
}

async function safeCopy(text: string) {
  const t = text || "";
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ChatMessage({
  role,
  content,
  attachments,
  planId = "assistant",
  isAuthed = false,
  onUpgradeClick,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isPaid = planId === "engineer" || planId === "professional" || planId === "consultant";
  const canUsePaidActions = isPaid && isAuthed;

  const dir = useMemo(() => (isArabicText(content) ? "rtl" : "ltr"), [content]);

  const shareText = useMemo(() => buildShareText(content), [content]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function onCopyClick() {
    if (!canUsePaidActions) {
      showToast(isAuthed ? "Upgrade required to copy." : "Please register to copy.");
      return;
    }
    const ok = await safeCopy(shareText);
    showToast(ok ? "Copied ✓" : "Copy failed");
  }

  async function onShareClick() {
    // Free/non-authed: allow opening share options but show hint inside
    if (!canUsePaidActions) {
      setShareOpen(true);
      return;
    }

    // Native share (best on mobile)
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ title: "engineerit.ai", text: shareText });
        return;
      } catch {
        // user canceled or not supported -> fallback
        setShareOpen(true);
        return;
      }
    }

    setShareOpen(true);
  }

  function onPrint() {
    if (!canUsePaidActions) {
      showToast(isAuthed ? "Upgrade required to print." : "Please register to print.");
      return;
    }
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const safe = shareText
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    w.document.write(
      `<pre style="white-space:pre-wrap;font-family:system-ui;padding:16px;line-height:1.6">${safe}</pre>`
    );
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  function onDownloadTxt() {
    if (!canUsePaidActions) {
      showToast(isAuthed ? "Upgrade required to download." : "Please register to download.");
      return;
    }
    const blob = new Blob([shareText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "engineerit-ai-response.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onUpgradeHintClick() {
    if (onUpgradeClick) onUpgradeClick();
    else window.location.href = isAuthed ? "/subscription" : "/register";
  }

  return (
    <div className={`msg ${role}`} dir={dir}>
      <div className="msg-bubble">
        {/* Content */}
        <div className="msg-content">
          {content}
        </div>

        {/* Attachments (optional) */}
        {attachments && attachments.length > 0 && (
          <div className="msg-attachments">
            {attachments.map((a, idx) => (
              <div key={a.id || idx} className="msg-attach">
                {a.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.name || "image"} className="msg-attach-img" />
                ) : (
                  <a href={a.url} target="_blank" rel="noreferrer" className="msg-attach-file">
                    {a.name || "file"}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ✅ Actions under AI reply only */}
        {role === "assistant" && (
          <div className="msg-actions" aria-label="message actions">
            <button
              type="button"
              className="msg-action-btn"
              onClick={onCopyClick}
              title={canUsePaidActions ? "Copy" : "Copy (upgrade required)"}
              aria-label="Copy"
            >
              ⧉
            </button>

            <button
              type="button"
              className="msg-action-btn"
              onClick={onShareClick}
              title={canUsePaidActions ? "Share" : "Share (upgrade required)"}
              aria-label="Share"
            >
              ⤴
            </button>

            {toast && <span className="msg-toast">{toast}</span>}
          </div>
        )}
      </div>

      {/* ✅ Share sheet (options) */}
      {role === "assistant" && shareOpen && (
        <div
          className="share-sheet"
          role="dialog"
          aria-label="Share options"
          onClick={() => setShareOpen(false)}
        >
          <div className="share-sheet-inner" onClick={(e) => e.stopPropagation()}>
            <div className="share-sheet-title">Share</div>

            {!canUsePaidActions && (
              <div className="share-upgrade-hint">
                {isAuthed ? (
                  <>
                    Upgrade to unlock full share/copy actions.{" "}
                    <button type="button" className="share-upgrade-btn" onClick={onUpgradeHintClick}>
                      Upgrade
                    </button>
                  </>
                ) : (
                  <>
                    Register to unlock full share/copy actions.{" "}
                    <button type="button" className="share-upgrade-btn" onClick={onUpgradeHintClick}>
                      Register
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="share-grid">
              <button
                type="button"
                className="share-item"
                onClick={() => {
                  window.open(buildWhatsAppLink(shareText), "_blank", "noopener,noreferrer");
                  setShareOpen(false);
                }}
              >
                WhatsApp
              </button>

              <button
                type="button"
                className="share-item"
                onClick={() => {
                  window.open(buildEmailLink(shareText), "_blank", "noopener,noreferrer");
                  setShareOpen(false);
                }}
              >
                Email
              </button>

              <button
                type="button"
                className="share-item"
                onClick={async () => {
                  const ok = await safeCopy(shareText);
                  showToast(ok ? "Copied ✓" : "Copy failed");
                  setShareOpen(false);
                }}
              >
                Copy
              </button>

              <button
                type="button"
                className="share-item"
                onClick={() => {
                  onPrint();
                  setShareOpen(false);
                }}
              >
                Print
              </button>

              <button
                type="button"
                className="share-item"
                onClick={() => {
                  onDownloadTxt();
                  setShareOpen(false);
                }}
              >
                Save (.txt)
              </button>

              <button type="button" className="share-item" onClick={() => setShareOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Local styles ONLY for buttons/sheet (does not touch your global scroll) */}
      <style jsx global>{`
        .msg-actions{
          display:flex;
          align-items:center;
          gap:8px;
          margin-top:8px;
          opacity:0.92;
        }
        .msg-action-btn{
          border:1px solid #e5e7eb;
          background:#fff;
          border-radius:10px;
          padding:6px 10px;
          cursor:pointer;
          font-size:14px;
          line-height:1;
        }
        .msg-action-btn:active{ transform:scale(0.98); }
        .msg-toast{
          margin-left:8px;
          font-size:12px;
          color:#6b7280;
        }

        .share-sheet{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.35);
          display:flex;
          align-items:flex-end;
          justify-content:center;
          z-index:9999;
        }
        .share-sheet-inner{
          width:min(560px, 100%);
          background:#fff;
          border-top-left-radius:18px;
          border-top-right-radius:18px;
          padding:14px;
          box-shadow:0 -12px 32px rgba(0,0,0,0.18);
        }
        .share-sheet-title{
          font-weight:700;
          font-size:14px;
          margin-bottom:8px;
        }
        .share-upgrade-hint{
          font-size:12px;
          color:#b45309;
          background:#fffbeb;
          border:1px solid #fcd34d;
          padding:8px 10px;
          border-radius:12px;
          margin-bottom:10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }
        .share-upgrade-btn{
          border:1px solid #f59e0b;
          background:#fff;
          border-radius:10px;
          padding:6px 10px;
          cursor:pointer;
          font-size:12px;
          white-space:nowrap;
        }
        .share-grid{
          display:grid;
          grid-template-columns:repeat(2, minmax(0,1fr));
          gap:10px;
        }
        .share-item{
          border:1px solid #e5e7eb;
          background:#f9fafb;
          border-radius:14px;
          padding:10px 12px;
          cursor:pointer;
          font-size:13px;
          text-align:center;
        }
      `}</style>
    </div>
  );
}
