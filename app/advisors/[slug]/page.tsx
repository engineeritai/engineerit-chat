"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import AdvisorChat from "../../components/AdvisorChat";
import { isAdvisorId } from "@/lib/advisors";
import { useMessages } from "@/lib/useMessages";

export default function AdvisorModePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const params = useParams<{ slug: string }>();
  const { m, dir } = useMessages();
  const slug = params?.slug;

  return (
    <div className="app-shell advisor-mode-page" dir={dir}>
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        {isAdvisorId(slug) ? (
          <AdvisorChat advisorId={slug} />
        ) : (
          <div className="page-wrap">
            <h1 className="page-title">{m.advisors.notFound}</h1>
            <Link href="/advisors" className="link">
              {m.advisors.backToAdvisors}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
