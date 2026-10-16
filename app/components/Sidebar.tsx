"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import AdvisorNav from "./AdvisorNav";
import LanguageToggle from "./LanguageToggle";
import { DISCIPLINES } from "@/lib/disciplines";
import { disciplineLabel } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";
import { SAUDI_BUSINESS_AUTH_NO, SAUDI_BUSINESS_VERIFY_URL } from "@/lib/trust";

type Props = {
  discipline: string;
  onDisciplineChange: (v: string) => void;
  onNewChat: () => void;
  threads: { id: string; title: string }[];
  currentThreadId?: string;
  onSelectThread: (id: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

function openExternal(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Sidebar({
  discipline,
  onDisciplineChange,
  onNewChat,
  threads,
  currentThreadId,
  onSelectThread,
  isMobileOpen,
  onCloseMobile,
}: Props) {
  const pathname = usePathname();
  const { locale, shell: s } = useMessages();
  const contactLabel = locale === "ar" ? "ملاحظات" : "Feedback";
  const payLabel = locale === "ar" ? "الدفع عبر ميسر" : "Payment processed by Moyasar";

  const content = (
    <aside
      className="sidebar-inner"
      style={{
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flexGrow: 1,
          paddingRight: 6,
        }}
      >
        <LanguageToggle className="lang-toggle-block" />
        <button className="btn w-full mb-3" onClick={onNewChat}>
          {s.chat.newChat}
        </button>

        <div>
          <h3>{s.chat.discipline}</h3>
          <select
            className="select"
            value={discipline}
            onChange={(e) => onDisciplineChange(e.target.value)}
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {disciplineLabel(locale, d)}
              </option>
            ))}
          </select>
        </div>

        <AdvisorNav currentPath={pathname} />

        <div>
          <h3>{s.chat.history}</h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 160,
              overflowY: "auto",
              paddingRight: 2,
            }}
          >
            {threads.length === 0 && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {s.chat.emptyHistory}
              </div>
            )}

            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onSelectThread(t.id);
                  onCloseMobile();
                }}
                style={{
                  textAlign: "left",
                  border: "1px solid #e5e7eb",
                  background: currentThreadId === t.id ? "#fff" : "#f9fafb",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 14,
                }}
                title={t.title}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid #e5e7eb",
          fontSize: 11,
          color: "#6b7280",
          lineHeight: 1.5,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            marginTop: 10,
            padding: "7px 9px",
            borderRadius: 10,
            background: "#EEF2FF",
            border: "1px solid #E0E7FF",
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "9999px",
              background: "#DBEAFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>

          <div style={{ fontSize: 10.5, lineHeight: 1.35, flex: 1 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#1D4ED8",
              }}
            >
              {s.trust.title}
            </div>
            <div style={{ color: "#374151" }}>
              {s.trust.auth} <span style={{ fontWeight: 600 }}>{SAUDI_BUSINESS_AUTH_NO}</span>
            </div>

            <Link
              href={SAUDI_BUSINESS_VERIFY_URL}
              target="_blank"
              className="sidebar-legal-link"
              style={{
                marginTop: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 9999,
                border: "1px solid #BFDBFE",
                background: "#EFF6FF",
                fontSize: 9.5,
                color: "#1D4ED8",
                fontWeight: 500,
              }}
            >
              <span>{s.trust.verify}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1D4ED8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13V6H11" />
                <path d="M6 18L18 6" />
              </svg>
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() =>
              openExternal("https://www.linkedin.com/in/engineerit-ai-40788339a")
            }
            title="LinkedIn"
            aria-label="LinkedIn"
            style={iconButtonStyle}
          >
            <img
              src="/linkedin.png"
              alt="LinkedIn"
              style={{ width: 14, height: 14, display: "block", objectFit: "contain" }}
            />
          </button>

          <button
            type="button"
            onClick={() => openExternal("https://x.com/engineeritai")}
            title="X"
            aria-label="X"
            style={iconButtonStyle}
          >
            <img src="/x.png" alt="X" style={iconImageStyle} />
          </button>

          <button
            type="button"
            onClick={() => openExternal("https://www.tiktok.com/@engineerit.ai")}
            title="TikTok"
            aria-label="TikTok"
            style={iconButtonStyle}
          >
            <img src="/tiktok.png" alt="TikTok" style={iconImageStyle} />
          </button>

          <button
            type="button"
            onClick={() => openExternal("https://www.snapchat.com/add/engineerit.ai")}
            title="Snapchat"
            aria-label="Snapchat"
            style={iconButtonStyle}
          >
            <img
              src="/snapchat.png"
              alt="Snapchat"
              style={{ width: 14, height: 14, display: "block", objectFit: "contain" }}
            />
          </button>

          <button
            type="button"
            onClick={() => openExternal("https://moyasar.com")}
            title={payLabel}
            aria-label={payLabel}
            style={iconButtonStyle}
          >
            <img
              src="/moyasar-icon.png"
              alt="Moyasar"
              style={{ width: 12, height: 12, display: "block", objectFit: "contain" }}
            />
          </button>

          <button
            type="button"
            onClick={() => openExternal("https://engineerit.ai/feedback")}
            title={contactLabel}
            aria-label={contactLabel}
            style={iconButtonStyle}
          >
            <img src="/favicon.ico" alt="eit" style={iconImageStyle} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="sidebar desktop-only">{content}</div>

      {isMobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={onCloseMobile}>
          <div
            className="sidebar sidebar-mobile-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "#F9FAFB",
  border: "1px solid #E5E7EB",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: "pointer",
};

const iconImageStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  display: "block",
  objectFit: "contain",
};
