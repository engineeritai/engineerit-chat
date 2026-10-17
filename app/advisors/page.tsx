"use client";

import Link from "next/link";
import MarketingShell from "../components/marketing/MarketingShell";
import AdvisorEcosystem from "../components/AdvisorEcosystem";
import { ADVISOR_IDS, ADVISORS, getAdvisor, hasAdvisorAccess, unlockPlanForAdvisor } from "@/lib/advisors";
import BuyPlanButton from "@/app/components/BuyPlanButton";
import { advisorsAreLive, advisorsNowLive } from "@/lib/advisorLaunch";
import { groupedPlaybooks } from "@/lib/playbooks";
import { useMessages } from "@/lib/useMessages";
import { useSubscriptionTier } from "@/lib/useSubscriptionTier";

export default function AdvisorsPage() {
  const { m } = useMessages();
  const { ready, isGuest, tier } = useSubscriptionTier();
  const live = advisorsAreLive();
  const nowLive = advisorsNowLive();
  const anyUnlocked = ADVISORS.some((advisor) => hasAdvisorAccess(tier, advisor.id, isGuest));

  return (
    <MarketingShell>
        <div className="page-wrap">
          <div className="advisor-breadcrumb">
            <Link href="/">{m.advisors.ecosystemAi}</Link>
            <span aria-hidden="true">›</span>
            <span>{m.advisors.sectionTitle}</span>
          </div>
          <div className="advisor-title-row">
            <h1 className="page-title">{m.advisors.landingTitle}</h1>
            {!live && (
              <span className="advisor-badge advisor-badge-soon">{m.advisors.comingSoonBadge}</span>
            )}
            {nowLive && (
              <span className="advisor-badge advisor-badge-on">{m.advisors.nowLiveBadge}</span>
            )}
          </div>
          <p className="page-subtitle">{m.advisors.landingSubtitle}</p>
          <p className="page-subtitle">{m.advisors.comingSoonBody}</p>

          <AdvisorEcosystem />

          {!live && (
            <div className="advisor-launch-banner">
              <span className="advisor-badge advisor-badge-soon">{m.advisors.comingSoonBadge}</span>
              <p>{m.advisors.comingSoonBody}</p>
            </div>
          )}

          {live && ready && !anyUnlocked && (
            <div className="advisor-lock-banner">
              <div>
                <div className="advisor-lock-title">{m.gating.lockedTitle}</div>
                <p>{m.gating.pilotNote}</p>
              </div>
              <div className="gate-actions">
                <a className="gate-btn" href="/pricing">
                  {m.gating.compareCta}
                </a>
              </div>
            </div>
          )}

          <div className="advisor-grid">
            {ADVISOR_IDS.map((id) => {
              const advisor = getAdvisor(id);
              if (!advisor) return null;
              const copy = m.advisors.items[advisor.id];
              const entitled = ready && hasAdvisorAccess(tier, advisor.id, isGuest);
              const unlocked = live && entitled;
              return (
                <article key={advisor.id} className="card advisor-card">
                  <div className="advisor-card-top">
                    <span className="advisor-chip-track">{copy.track}</span>
                    {!live && (
                      <span className="advisor-badge advisor-badge-soon">
                        {m.advisors.comingSoonBadge}
                      </span>
                    )}
                    {live && ready && (
                      <span className={unlocked ? "advisor-badge advisor-badge-on" : "advisor-badge"}>
                        {unlocked ? m.advisors.includedBadge : `🔒 ${m.advisors.lockedBadge}`}
                      </span>
                    )}
                  </div>
                  <h2>{copy.name}</h2>
                  <p className="advisor-included-on">{m.advisors.includedOn[advisor.id]}</p>
                  <p>{copy.summary}</p>
                  {unlocked ? (
                    <ul className="advisor-capabilities">
                      {copy.capabilities.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="advisor-capabilities">
                      {copy.capabilities.slice(0, 2).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {unlocked ? (
                    <div className="advisor-card-playbooks">
                      {groupedPlaybooks(advisor.id).map((group) => (
                        <div key={group.group ?? "all"} className="advisor-card-playbook-group">
                          {group.group ? (
                            <p className="advisor-playbook-group-label">
                              {m.advisors.playbookGroups[group.group]}
                            </p>
                          ) : null}
                          {group.playbooks.map((playbook) => (
                            <span key={playbook.id}>{copy.playbooks[playbook.id]?.name}</span>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="advisor-card-actions">
                    {unlocked ? (
                      <Link className="advisor-card-link" href={`/advisors/${advisor.id}`}>
                        {m.advisors.open}
                      </Link>
                    ) : (
                      <>
                        <BuyPlanButton
                          planId={unlockPlanForAdvisor(advisor.id)}
                          interval="month"
                          verb="upgrade"
                          className="advisor-card-link"
                        />
                        <Link className="advisor-card-link advisor-card-link-secondary" href={`/advisors/${advisor.id}`}>
                          {!live ? m.advisors.comingSoonCta : m.advisors.preview}
                        </Link>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="advisor-responsibility">{m.advisors.responsibility}</p>
        </div>
    </MarketingShell>
  );
}
