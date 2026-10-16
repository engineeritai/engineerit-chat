"use client";

import Link from "next/link";
import { ADVISOR_IDS } from "@/lib/advisors";
import { useMessages } from "@/lib/useMessages";

export default function AdvisorNav({ currentPath }: { currentPath: string | null }) {
  const { m } = useMessages();

  return (
    <div>
      <h3>{m.advisors.sectionTitle}</h3>
      <nav className="sidebar-nav">
        <Link
          href="/advisors"
          className={`sidebar-link ${currentPath === "/advisors" ? "sidebar-link-active" : ""}`}
        >
          {m.advisors.landingNav}
        </Link>
        {ADVISOR_IDS.map((id) => {
          const href = `/advisors/${id}`;
          const active = currentPath === href;
          return (
            <Link
              key={id}
              href={href}
              className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
            >
              {m.advisors.items[id].name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
