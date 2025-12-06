"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";

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

const DISCIPLINES = [
  "General",
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Instrumentation",
  "Process Engineering",
  "Geotechnical",
  "Mining Engineering",
  "Architectural",
  "Project Engineering",
  "Value Engineering",
  "Survey",
  "Exploration",
  "HSE / HAZOP",
];

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

  const content = (
    <aside
      className="sidebar-inner"
      style={{
        maxWidth: "100%",
        height: "100vh",      // ارتفاع ثابت
        overflow: "hidden",   // منع scroll عام
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* MAIN CONTENT (قابل للتمرير داخلي لو المحتوى كثير) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flexGrow: 1,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
        {/* New chat */}
        <button className="btn w-full mb-3" onClick={onNewChat}>
          + New chat
        </button>

        {/* Discipline */}
        <div>
          <h3>Discipline</h3>
          <select
            className="select"
            value={discipline}
            onChange={(e) => onDisciplineChange(e.target.value)}
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Pages */}
        <div>
          <h3>Pages</h3>
          <nav className="sidebar-nav">
            <SidebarLink href="/" label="Chat" currentPath={pathname} />
            <SidebarLink
              href="/register"
              label="Registration & Plans"
              currentPath={pathname}
            />
            <SidebarLink
              href="/profile"
              label="My Profile"
              currentPath={pathname}
            />
            <SidebarLink
              href="/feedback"
              label="Feedback & Complaints"
              currentPath={pathname}
            />
            <SidebarLink
              href="/legal/terms"
              label="User Policy & Agreement"
              currentPath={pathname}
            />
          </nav>
        </div>

        {/* History */}
        <div>
          <h3>History</h3>
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
                No conversations yet
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

      {/* FOOTER + AUTH BADGE + SOCIAL & ICONS (ثابت أسفل الـ sidebar) */}
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
        <div style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>
          AI Engineering Assistant
        </div>

        <div style={{ marginBottom: 2 }}>
          © 2025 <span style={{ fontWeight: 500 }}>engineerit.ai</span>. All
          rights reserved.
        </div>

        <div>
          Use of engineerit as per{" "}
          <Link href="/legal/terms" className="sidebar-legal-link">
            User Policy &amp; Agreement
          </Link>
          .
        </div>

        {/* VERIFIED BADGE */}
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
              Verified Store
            </div>
            <div style={{ color: "#374151" }}>
              Auth No.:{" "}
              <span style={{ fontWeight: 600 }}>0000204877</span>
            </div>

            <Link
              href="https://eauthenticate.saudibusiness.gov.sa/inquiry"
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
              <span>Verify via Saudi Business Center</span>
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

        {/* SOCIAL + ICONS (buttons مع شعارات حديثة) */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {/* LinkedIn (نفسه بحرف in) */}
          <button
            type="button"
            onClick={() =>
              openExternal(
                "https://www.linkedin.com/in/engineerit-ai-40788339a"
              )
            }
            title="LinkedIn"
            aria-label="LinkedIn"
            style={iconButtonStyle}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: "#0A66C2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F9FAFB",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              in
            </span>
          </button>

          {/* X (حديث) */}
          <button
            type="button"
            onClick={() => openExternal("https://x.com/engineeritai")}
            title="X (Twitter)"
            aria-label="X (Twitter)"
            style={iconButtonStyle}
          >
            <XIcon />
          </button>

          {/* TikTok (حديث) */}
          <button
            type="button"
            onClick={() =>
              openExternal("https://www.tiktok.com/@engineerit.ai")
            }
            title="TikTok"
            aria-label="TikTok"
            style={iconButtonStyle}
          >
            <TikTokIcon />
          </button>

          {/* Snapchat (حديث) */}
          <button
            type="button"
            onClick={() =>
              openExternal("https://www.snapchat.com/add/engineerit.ai")
            }
            title="Snapchat"
            aria-label="Snapchat"
            style={iconButtonStyle}
          >
            <SnapchatIcon />
          </button>

          {/* Moyasar (حديث) */}
          <button
            type="button"
            onClick={() => openExternal("https://moyasar.com")}
            title="Payment processed and controlled by Moyasar"
            aria-label="Moyasar"
            style={iconButtonStyle}
          >
            <MoyasarIcon />
          </button>

          {/* engineerit favicon → feedback */}
          <button
            type="button"
            onClick={() => openExternal("https://engineerit.ai/feedback")}
            title="Contact us"
            aria-label="Contact us"
            style={iconButtonStyle}
          >
            <img
              src="/favicon.ico"
              alt="engineerit"
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                objectFit: "contain",
              }}
            />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="sidebar desktop-only">{content}</div>

      {/* Mobile */}
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

function SidebarLink({
  href,
  label,
  currentPath,
}: {
  href: string;
  label: string;
  currentPath: string | null;
}) {
  const active =
    currentPath === href ||
    (href !== "/" && currentPath && currentPath.startsWith(href));

  return (
    <Link
      href={href}
      className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
    >
      {label}
    </Link>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  background: "#F9FAFB",
  border: "1px solid #E5E7EB",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: "pointer",
};

// ===== SVG ICONS =====

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width="24" height="24" rx="4" fill="#000000" />
      <path
        d="M7 6.5L13.2 15.1L7.4 17.5H6.8L10.8 12.9L6 6.5H8L11.6 11.3L15.4 6.5H17L12.3 12.5L17.2 17.5H15.2L11 12.5L7 17.5H5.8L10.2 11.9L6.6 6.5H7Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width="24" height="24" rx="4" fill="#000000" />
      <path
        d="M14.5 6.5c.5 1.1 1.4 1.8 2.6 2v2.1c-1.1-.1-2-.4-2.8-.9v4.2a3.6 3.6 0 1 1-3.6-3.6c.3 0 .6 0 .9.1v2a1.6 1.6 0 1 0 1.1 1.6V6.5h1.8z"
        fill="#FFFFFF"
      />
      <path
        d="M11 10.3a3.6 3.6 0 0 1 1.6.4V9.3c-.3-.1-.6-.1-.9-.1a3.6 3.6 0 0 0-3.6 3.6c0 1 .4 1.9 1 2.5a3.6 3.6 0 0 1 3.2-4.9Z"
        fill="#22D3EE"
      />
      <path
        d="M17.1 8.5c-1.2-.2-2.1-.9-2.6-2v1.5c.8.5 1.7.8 2.8.9v-1.4h-.2z"
        fill="#F97316"
      />
    </svg>
  );
}

function SnapchatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect x="0" y="0" width="24" height="24" rx="4" fill="#FFFC00" />
      <path
        d="M12 5.5c-2 0-3.1 1.4-3.2 3-.1 1.1 0 1.7-.6 2.4-.3.4-.8.6-1.3.7-.4.1-.6.5-.4.9.3.5.9.6 1.5.7.6.1 1.1.3 1.4.7.4.4.4 1 .6 1.5.2.5.7.9 1.3.9h1.4c.6 0 1.1-.4 1.3-.9.2-.5.2-1.1.6-1.5.3-.4.8-.6 1.4-.7.6-.1 1.2-.2 1.5-.7.2-.4 0-.8-.4-.9-.5-.1-1-.3-1.3-.7-.6-.7-.5-1.3-.6-2.4-.1-1.6-1.2-3-3.2-3Z"
        fill="#111827"
      />
    </svg>
  );
}

function MoyasarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <path
        d="M46 40c-12 0-21 10-21 22v76c0 12 9 22 21 22 7 0 13-3 18-9l40-50 40 50c5 6 11 9 18 9 12 0 21-10 21-22V62c0-12-9-22-21-22-7 0-13 3-18 9l-40 50-40-50c-5-6-11-9-18-9Z"
        fill="#000000"
      />
    </svg>
  );
}
