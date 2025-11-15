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
      <button className="btn w-full mb-3" onClick={onNewChat}>
        + New chat
      </button>

      <div style={{ marginBottom: 16 }}>
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

      <div style={{ marginBottom: 16 }}>
        <h3>Pages</h3>
        <nav className="sidebar-nav">
          <SidebarLink href="/" label="Chat" currentPath={pathname} />
          <SidebarLink
            href="/register"
            label="Plans & Registration"
            currentPath={pathname}
          />
          <SidebarLink href="/profile" label="My Profile" currentPath={pathname} />
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

      <div>
        <h3>History</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {threads.length === 0 && (
            <div style={{ fontSize: 13, color: "#6b7280" }}>No conversations yet</div>
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
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar desktop-only">{content}</div>

      {/* Mobile overlay sidebar */}
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