"use client";

import { useState } from "react";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const finalText = `${content}\n\n— engineerit.ai`;

  const copyText = async () => {
    await navigator.clipboard.writeText(finalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareText = async () => {
    if (navigator.share) {
      await navigator.share({
        text: finalText,
      });
    } else {
      copyText();
      alert("Share not supported, text copied instead");
    }
  };

  return (
    <div className={`msg ${role}`}>
      <div className="msg-bubble">
        {/* CONTENT */}
        <div className="msg-content">
          {content}
        </div>

        {/* ACTIONS – only under AI replies */}
        {role === "assistant" && (
          <div className="msg-actions">
            <button onClick={copyText} className="msg-btn">
              {copied ? "✓ Copied" : "Copy"}
            </button>

            <button onClick={shareText} className="msg-btn">
              Share
            </button>
          </div>
        )}
      </div>

      {/* Local styles – DO NOT touch global.css */}
      <style jsx>{`
        .msg {
          display: flex;
          margin-bottom: 14px;
        }

        .msg.user {
          justify-content: flex-end;
        }

        .msg.assistant {
          justify-content: flex-start;
        }

        .msg-bubble {
          max-width: 92%;
          background: ${role === "assistant" ? "#ffffff" : "#e6f3ff"};
          border-radius: 16px;
          padding: 14px 14px 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .msg-content {
          font-size: 15px;
          line-height: 1.55;
          color: #111827;

          /* ChatGPT-like behavior */
          white-space: pre-wrap;
          word-break: break-word;

          /* Horizontal scroll ONLY if needed */
          overflow-x: auto;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }

        /* Fix big tables / code blocks */
        .msg-content :global(table),
        .msg-content :global(pre) {
          display: block;
          overflow-x: auto;
          max-width: 100%;
        }

        .msg-actions {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }

        .msg-btn {
          font-size: 12px;
          background: transparent;
          border: 1px solid #e5e7eb;
          padding: 4px 10px;
          border-radius: 999px;
          cursor: pointer;
          color: #374151;
        }

        .msg-btn:hover {
          background: #f3f4f6;
        }

        /* Mobile tuning */
        @media (max-width: 640px) {
          .msg-content {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
