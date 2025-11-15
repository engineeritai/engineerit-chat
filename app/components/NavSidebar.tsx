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
      <div style={{ marginBottom: 16 }}>
        <h3>Navigation</h3>
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
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="sidebar desktop-only">{content}</div>

      {/* Mobile overlay */}
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
