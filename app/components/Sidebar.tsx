"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <aside className="sidebar-inner">
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

      {/* FOOTER + AUTH BADGE */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 12,
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
          © 2025 <span style={{ fontWeight: 500 }}>engineerit</span>. All rights
          reserved.
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
            padding: "8px 10px",
            borderRadius: 10,
            background: "#EEF2FF",
            border: "1px solid #E0E7FF",
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflow: "hidden", // prevents wide expansion
          }}
        >
          {/* Icon Circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "9999px",
              background: "#DBEAFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
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

          {/* Badge Text */}
          <div style={{ fontSize: 10.5, lineHeight: 1.4, whiteSpace: "normal" }}>
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

            <div style={{ fontWeight: 600, color: "#111827" }}>
              E-Commerce Authentication
            </div>

            <div style={{ color: "#374151" }}>
              Auth No.: <span style={{ fontWeight: 600 }}>0000204877</span>
            </div>

            <div style={{ marginTop: 1 }}>
              <Link
                href="https://eauthenticate.saudibusiness.gov.sa/inquiry"
                target="_blank"
                className="sidebar-legal-link"
                style={{ fontSize: 9.5 }}
              >
                Verify store
              </Link>
            </div>
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
