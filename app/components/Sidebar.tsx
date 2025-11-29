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
    <aside className="sidebar-inner" style={{ maxWidth: "100%" }}>
      {/* MAIN CONTENT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              label="Plans & Registration"
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

      {/* FOOTER + AUTH BADGE + SOCIAL & APPS ICONS */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 10,
          borderTop: "1px solid #e5e7eb",
          fontSize: 11,
          color: "#6b7280",
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>
          AI Engineering Assistant
        </div>

        <div style={{ marginBottom: 2 }}>
          © 2025 <span style={{ fontWeight: 500 }}>engineerit.ai</span>. All rights
          reserved.
        </div>

        <div>
          Use of engineerit as per{" "}
          <Link href="/legal/terms" className="sidebar-legal-link">
            User Policy &amp; Agreement
          </Link>
          .
        </div>

        {/* VERIFIED BADGE (مختصر + زر تحقق واضح) */}
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

            {/* زر التحقق عبر مركز الأعمال السعودي */}
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

        {/* SOCIAL + APPS ICONS (مربعات مرتبة في النص تحت صندوق التوثيق) */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/engineerit-ai-40788339a"
            target="_blank"
            rel="noreferrer"
            title="LinkedIn"
            aria-label="LinkedIn"
            style={squareIcon("#0A66C2", "#F9FAFB", 12, 700)}
          >
            in
          </a>

          {/* X (Twitter) */}
          <a
            href="https://x.com/engineeritai"
            target="_blank"
            rel="noreferrer"
            title="X (Twitter)"
            aria-label="X (Twitter)"
            style={squareIcon("#000000", "#F9FAFB", 13, 700)}
          >
            X
          </a>

          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@engineerit.ai"
            target="_blank"
            rel="noreferrer"
            title="TikTok"
            aria-label="TikTok"
            style={squareIcon("#000000", "#F9FAFB", 13, 700)}
          >
            ♫
          </a>

          {/* Snapchat */}
          <a
            href="https://www.snapchat.com/add/engineerit.ai"
            target="_blank"
            rel="noreferrer"
            title="Snapchat"
            aria-label="Snapchat"
            style={squareIcon("#FFFC00", "#111827", 16, 700)}
          >
            👻
          </a>

          {/* Apple (coming soon) */}
          <div
            title="App Store (coming soon)"
            aria-label="App Store (coming soon)"
            style={squareIcon("#F3F4F6", "#111827", 16, 600)}
          >
            
          </div>

          {/* Android (coming soon) */}
          <div
            title="Google Play (coming soon)"
            aria-label="Google Play (coming soon)"
            style={squareIcon("#22C55E", "#F9FAFB", 14, 700)}
          >
            A
          </div>

          {/* Huawei (coming soon) */}
          <div
            title="Huawei AppGallery (coming soon)"
            aria-label="Huawei AppGallery (coming soon)"
            style={squareIcon("#DC2626", "#F9FAFB", 13, 700)}
          >
            H
          </div>
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

// helper for square icons (social + stores)
function squareIcon(
  bg: string,
  fg: string,
  fontSize: number,
  fontWeight: number
): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 6,
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: fg,
    fontSize,
    textDecoration: "none",
    fontWeight,
    flexShrink: 0,
  };
}
