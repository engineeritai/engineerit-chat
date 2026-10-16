"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import AdvisorEcosystem from "../components/AdvisorEcosystem";
import { ADVISORS, hasAdvisorAccess } from "@/lib/advisors";
import { playbooksFor } from "@/lib/playbooks";
import { useMessages } from "@/lib/useMessages";
import { useSubscriptionTier } from "@/lib/useSubscriptionTier";

export default function AdvisorsPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const { m, dir } = useMessages();
  const { ready, isGuest, tier } = useSubscriptionTier();
  const anyUnlocked = ADVISORS.some((advisor) => hasAdvisorAccess(tier, advisor.id, isGuest));

  return (
    <div className="app-shell" dir={dir}>
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <div className="advisor-breadcrumb">
            <Link href="/">engineerit AI</Link>
            <span aria-hidden="true">›</span>
            <span>{m.advisors.sectionTitle}</span>
          </div>
          <h1 className="page-title">{m.advisors.landingTitle}</h1>
          <p className="page-subtitle">{m.advisors.landingSubtitle}</p>

          <AdvisorEcosystem />

          {ready && !anyUnlocked && (
            <div className="advisor-lock-banner">
              <div>
                <div className="advisor-lock-title">{m.gating.lockedTitle}</div>
                <p>{m.gating.lockedBody}</p>
              </div>
              <div className="gate-actions">
                {isGuest ? (
                  <a className="gate-btn gate-btn-primary" href="/register">
                    {m.gating.registerCta}
                  </a>
                ) : (
                  <a className="gate-btn gate-btn-primary" href="/subscription">
                    {m.gating.upgradeCta}
                  </a>
                )}
                <a className="gate-btn" href="/pricing">
                  {m.gating.compareCta}
                </a>
              </div>
            </div>
          )}

          <div className="advisor-grid">
            {ADVISORS.map((advisor) => {
              const copy = m.advisors.items[advisor.id];
              const unlocked = ready && hasAdvisorAccess(tier, advisor.id, isGuest);
              return (
                <article key={advisor.id} className="card advisor-card">
                  <div className="advisor-card-top">
                    <span className="advisor-chip-track">{copy.track}</span>
                    {ready && (
                      <span className={unlocked ? "advisor-badge advisor-badge-on" : "advisor-badge"}>
                        {unlocked ? m.advisors.includedBadge : `🔒 ${m.advisors.lockedBadge}`}
                      </span>
                    )}
                  </div>
                  <h2>{copy.name}</h2>
                  <p>{copy.summary}</p>
                  <ul className="advisor-capabilities">
                    {copy.capabilities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="advisor-card-playbooks">
                    {playbooksFor(advisor.id).map((playbook) => (
                      <span key={playbook.id}>{copy.playbooks[playbook.id]?.name}</span>
                    ))}
                  </div>
                  <Link className="advisor-card-link" href={`/advisors/${advisor.id}`}>
                    {ready && !unlocked ? m.advisors.preview : m.advisors.open}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
