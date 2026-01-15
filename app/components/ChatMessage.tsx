"use client";

import { useState } from "react";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);

  const finalText = `${content}\n\n— engineerit.ai`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalText);
      alert("Copied");
    } catch {
      alert("Copy failed");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: finalText,
        });
      } catch {}
    } else {
      setShowShareOptions((v) => !v);
    }
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(finalText)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShowShareOptions(false);
  };

  const shareEmail = () => {
    window.location.href = `mailto:?body=${encodeURIComponent(finalText)}`;
    setShowShareOptions(false);
  };

  return (
    <div
      style={{
        marginBottom: 20,
        display: "flex",
        justifyContent: role === "user" ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          background: role === "assistant" ? "#f9fafb" : "#2563eb",
          color: role === "assistant" ? "#111827" : "#ffffff",
          padding: "12px 14px",
          borderRadius: 12,
          fontSize: 15,
          lineHeight: 1.6,
          overflowX: "auto",
        }}
      >
        {/* message content */}
        <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>

        {/* ACTIONS (always visible under AI messages) */}
        {role === "assistant" && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 14,
              alignItems: "center",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#2563eb",
                fontWeight: 500,
              }}
            >
              📋 Copy
            </button>

            <button
              onClick={handleShare}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#2563eb",
                fontWeight: 500,
              }}
            >
              🔗 Share
            </button>
          </div>
        )}

        {/* Share options */}
        {showShareOptions && (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 10,
              fontSize: 13,
            }}
          >
            <button
              onClick={shareWhatsApp}
              style={{
                border: "1px solid #e5e7eb",
                padding: "4px 8px",
                borderRadius: 6,
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              WhatsApp
            </button>

            <button
              onClick={shareEmail}
              style={{
                border: "1px solid #e5e7eb",
                padding: "4px 8px",
                borderRadius: 6,
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
