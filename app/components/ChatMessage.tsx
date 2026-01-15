// app/components/ChatMessage.tsx
"use client";

import React, { useMemo, useState } from "react";

type Role = "user" | "assistant";
type PlanId = "assistant" | "engineer" | "professional" | "consultant";

function hasArabic(text: string) {
  // Arabic + Arabic Supplement + Arabic Presentation Forms
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text || ""
  );
}

function isPaidPlan(plan?: PlanId | null) {
  return plan === "engineer" || plan === "professional" || plan === "consultant";
}

function buildWhatsAppShare(text: string) {
  const encoded = encodeURIComponent(text);
  return `https://wa.me/?text=${encoded}`;
}

export default function ChatMessage({
  role,
  content,
  planId, // optional: pass from page.tsx if available
  isAuthenticated, // optional: pass from page.tsx if available
  onRequireUpgrade, // optional: show your own UI instead of alert
}: {
  role: Role;
  content: string;
  planId?: PlanId | null;
  isAuthenticated?: boolean;
  onRequireUpgrade?: () => void;
}) {
  const dir = useMemo<"rtl" | "ltr">(() => (hasArabic(content) ? "rtl" : "ltr"), [
    content,
  ]);

  const canUsePaidActions = useMemo(() => {
    // paid plans: share + copy enabled
    // free plan: show icons but gated (register/upgrade message)
    // non-user: treat as not authenticated
    return {
      paid: isPaidPlan(planId),
      authed: Boolean(isAuthenticated),
    };
  }, [planId, isAuthenticated]);

  const [shareOpen, setShareOpen] = useState(false);

  async function copyToClipboard() {
    try {
      if (!canUsePaidActions.authed) {
        if (onRequireUpgrade) onRequireUpgrade();
        else alert("Please register / sign in to use copy & share.");
        return;
      }
      if (!canUsePaidActions.paid) {
        if (onRequireUpgrade) onRequireUpgrade();
        else alert("Copy & Share are available for paid plans. Please upgrade.");
        return;
      }
      await navigator.clipboard.writeText(content);
    } catch {
      // fallback
      try {
        const el = document.createElement("textarea");
        el.value = content;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch {}
    }
  }

  async function shareSystem() {
    // Web Share API
    try {
      if (!canUsePaidActions.authed) {
        if (onRequireUpgrade) onRequireUpgrade();
        else alert("Please register / sign in to share.");
        return;
      }
      if (!canUsePaidActions.paid) {
        if (onRequireUpgrade) onRequireUpgrade();
        else alert("Share is available for paid plans. Please upgrade.");
        return;
      }

      const nav: any = navigator;
      if (nav?.share) {
        await nav.share({
          title: "engineerit.ai",
          text: content,
        });
      } else {
        setShareOpen(true); // fallback menu
      }
    } catch {
      // user canceled or not supported
    }
  }

  function openShareMenu() {
    // For free plan: show gated info
    if (!canUsePaidActions.authed) {
      if (onRequireUpgrade) onRequireUpgrade();
      else alert("Please register / sign in to share.");
      return;
    }
    if (!canUsePaidActions.paid) {
      if (onRequireUpgrade) onRequireUpgrade();
      else alert("Share is available for paid plans. Please upgrade.");
      return;
    }
    setShareOpen(true);
  }

  function downloadTxt() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "engineerit-response.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printText() {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.open();
    w.document.write(`
      <html>
        <head><title>engineerit.ai</title></head>
        <body style="font-family: system-ui, -apple-system, Segoe UI, Arial; padding: 24px; white-space: pre-wrap;">
          ${String(content)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")}
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  // Minimal rendering (keeps your existing structure: msg + role)
  // If your page already renders markdown elsewhere, this component will still work.
  // We keep it as plain text and allow horizontal scroll for long lines/tables pasted.
  return (
    <div className={`msg ${role}`} dir={dir}>
      {/* content */}
      <div className="msg-content">{content}</div>

      {/* actions under AI reply only */}
      {role === "assistant" && (
        <div className="msg-actions" aria-label="message actions">
          {/* Copy */}
          <button
            type="button"
            className="msg-action-btn"
            onClick={copyToClipboard}
            title={
              canUsePaidActions.paid && canUsePaidActions.authed
                ? "Copy"
                : "Copy (upgrade required)"
            }
            aria-label="Copy"
          >
            ⧉
          </button>

          {/* Share (system share first, then menu fallback) */}
          <button
            type="button"
            className="msg-action-btn"
            onClick={shareSystem}
            onContextMenu={(e) => {
              e.preventDefault();
              openShareMenu(); // right-click / long-press fallback menu
            }}
            title={
              canUsePaidActions.paid && canUsePaidActions.authed
                ? "Share"
                : "Share (upgrade required)"
            }
            aria-label="Share"
          >
            ⤴
          </button>
        </div>
      )}

      {/* Share fallback menu (paid only) */}
      {role === "assistant" && shareOpen && canUsePaidActions.paid && canUsePaidActions.authed && (
        <div className="share-sheet" role="dialog" aria-label="Share options">
          <div className="share-sheet-inner">
            <div className="share-sheet-title">Share</div>

            <div className="share-grid">
              <button
                type="button"
                className="share-item"
                onClick={() => {
                  window.open(buildWhatsAppShare(content), "_blank", "noopener,noreferrer");
                  setShareOpen(false);
                }}
              >
                WhatsApp
              </button>

              <button
                type="button"
                className="share-item"
                onClick={() => {
                  copyToClipboard();
                  setShareOpen(false);
                }}
              >
                Copy
              </button>

              <button
                type="button"
                className="share-item"
                onClick={() => {
                  downloadTxt();
                  setShareOpen(false);
                }}
              >
                Save (TXT)
              </button>

              <button
                type="button"
                className="share-item"
                onClick={() => {
                  printText();
                  setShareOpen(false);
                }}
              >
                Print
              </button>
            </div>

            <button
              type="button"
              className="share-close"
              onClick={() => setShareOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Local styles (no need to touch global.css) */}
      <style jsx global>{`
        .msg-content {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* Mobile/table overflow behavior (ChatGPT-like: scroll only inside message) */
        .msg-content {
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .msg-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          opacity: 0.85;
        }

        .msg-action-btn {
          border: 1px solid rgba(229, 231, 235, 1);
          background: #ffffff;
          border-radius: 9999px;
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }

        .msg-action-btn:active {
          transform: translateY(1px);
        }

        .share-sheet {
          position: fixed;
          inset: 0;
          background: rgba(17, 24, 39, 0.45);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
          z-index: 9999;
        }

        .share-sheet-inner {
          width: 100%;
          max-width: 520px;
          background: #ffffff;
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .share-sheet-title {
          font-weight: 700;
          color: #111827;
          margin-bottom: 10px;
        }

        .share-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .share-item {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 12px;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 600;
          color: #111827;
          font-size: 13px;
          text-align: center;
        }

        .share-close {
          margin-top: 12px;
          width: 100%;
          border: none;
          background: #111827;
          color: white;
          border-radius: 12px;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
