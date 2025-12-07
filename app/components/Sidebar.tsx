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
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* MAIN CONTENT (scroll only here if needed) */}
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

      {/* FOOTER + VERIFIED + ICONS */}
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

        {/* SOCIAL + OTHER ICONS */}
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
            <img
              src="/linkedin.png"
              alt="LinkedIn"
              style={{
                width: 14,
                height: 14,
                display: "block",
                objectFit: "contain",
              }}
            />
          </button>

          {/* X */}
          <button
            type="button"
            onClick={() => openExternal("https://x.com/engineeritai")}
            title="X"
            aria-label="X"
            style={iconButtonStyle}
          >
            <img src="/x.png" alt="X" style={iconImageStyle} />
          </button>

          {/* TikTok */}
          <button
            type="button"
            onClick={() =>
              openExternal("https://www.tiktok.com/@engineerit.ai")
            }
            title="TikTok"
            aria-label="TikTok"
            style={iconButtonStyle}
          >
            <img src="/tiktok.png" alt="TikTok" style={iconImageStyle} />
          </button>

          {/* Snapchat (14px) */}
          <button
            type="button"
            onClick={() =>
              openExternal("https://www.snapchat.com/add/engineerit.ai")
            }
            title="Snapchat"
            aria-label="Snapchat"
            style={iconButtonStyle}
          >
            <img
              src="/snapchat.png"
              alt="Snapchat"
              style={{
                width: 14,
                height: 14,
                display: "block",
                objectFit: "contain",
              }}
            />
          </button>

          {/* Moyasar (smaller) */}
          <button
            type="button"
            onClick={() => openExternal("https://moyasar.com")}
            title="Payment processed and controlled by Moyasar"
            aria-label="Moyasar"
            style={iconButtonStyle}
          >
            <img
              src="/moyasar-icon.png"
              alt="Moyasar"
              style={{
                width: 12,
                height: 12,
                display: "block",
                objectFit: "contain",
              }}
            />
          </button>

          {/* engineerit → eit (favicon) */}
          <button
            type="button"
            onClick={() => openExternal("https://engineerit.ai/feedback")}
            title="Contact us"
            aria-label="Contact us"
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

/* base style for all small icon buttons */
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
