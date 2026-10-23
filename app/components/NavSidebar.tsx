"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageToggle from "./LanguageToggle";
import AdvisorNav from "./AdvisorNav";
import { useMessages } from "@/lib/useMessages";

type Props = {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

export default function NavSidebar({ isMobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const { shell: s } = useMessages();

  const content = (
    <aside className="sidebar-inner">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <LanguageToggle className="lang-toggle-block" />
        <div>
          <h3>{s.nav.navigation}</h3>
          <nav className="sidebar-nav">
            <SidebarLink href="/" label={s.nav.home} currentPath={pathname} />
            <SidebarLink href="/chat" label={s.nav.chat} currentPath={pathname} />
            <SidebarLink href="/advisors" label={s.nav.advisors} currentPath={pathname} />
            <SidebarLink href="/pricing" label={s.nav.pricing} currentPath={pathname} />
            <SidebarLink href="/faq" label={s.nav.faq} currentPath={pathname} />
            <SidebarLink href="/question" label={s.nav.question} currentPath={pathname} />
            <SidebarLink href="/register" label={s.nav.register} currentPath={pathname} />
            <SidebarLink href="/account/team" label={s.nav.team} currentPath={pathname} />
            <SidebarLink href="/profile" label={s.nav.profile} currentPath={pathname} />
            <SidebarLink href="/feedback" label={s.nav.feedback} currentPath={pathname} />
            <SidebarLink href="/legal/terms" label={s.nav.terms} currentPath={pathname} />
          </nav>
        </div>

        <AdvisorNav currentPath={pathname} />
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
          {s.footer.blurb}
        </div>
        <div style={{ marginBottom: 2 }}>
          © {new Date().getFullYear()}{" "}
          <span style={{ fontWeight: 500 }}>engineerit.ai</span>. {s.footer.rights}
        </div>
        <div>
          {s.footer.policyLead}{" "}
          <Link href="/legal/terms" className="sidebar-legal-link">
            {s.footer.policyLink}
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
