"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

export default function NavSidebar({ isMobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();

  const content = (
    <aside className="sidebar-inner">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h3>Navigation</h3>
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
      </div>

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
