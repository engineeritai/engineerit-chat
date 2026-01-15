"use client";

import React from "react";

type Props = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({ role, content }: Props) {
  const isAI = role === "assistant";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${content}\n\n— engineerit.ai`
      );
      alert("Copied");
    } catch {
      alert("Copy failed");
    }
  };

  const handleShare = async () => {
    const text = `${content}\n\n— engineerit.ai`;

    if (navigator.share) {
      try {
        await navigator.share({
          text,
        });
      } catch {
        /* ignore */
      }
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  };

  return (
    <div className={`chat-row ${isAI ? "ai" : "user"}`}>
      <div className="bubble">
        <div className="bubble-content">{content}</div>

        {isAI && (
          <div className="ai-actions">
            <button onClick={handleCopy} title="Copy">
              📋 Copy
            </button>
            <button onClick={handleShare} title="Share">
              🔗 Share
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .chat-row {
          display: flex;
          margin-bottom: 14px;
        }

        .chat-row.user {
          justify-content: flex-end;
        }

        .chat-row.ai {
          justify-content: flex-start;
        }

        .bubble {
          max-width: 100%;
          background: ${isAI ? "#ffffff" : "#2563eb"};
          color: ${isAI ? "#111827" : "#ffffff"};
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .bubble-content {
          font-size: 14px;
          line-height: 1.6;
          word-break: break-word;
          overflow-x: auto;
        }

        /* Horizontal scroll for tables / long content */
        .bubble-content table,
        .bubble-content pre {
          display: block;
          width: 100%;
          overflow-x: auto;
        }

        .bubble-content::-webkit-scrollbar {
          height: 6px;
        }

        .bubble-content::-webkit-scrollbar-thumb {
          background: #c7c7c7;
          border-radius: 6px;
        }

        .ai-actions {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          font-size: 12px;
        }

        .ai-actions button {
          background: transparent;
          border: none;
          color: #2563eb;
          cursor: pointer;
          padding: 0;
          font-size: 12px;
        }

        .ai-actions button:hover {
          text-decoration: underline;
        }

        @media (max-width: 640px) {
          .bubble {
            max-width: 100%;
            padding: 12px 14px;
          }

          .bubble-content {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
