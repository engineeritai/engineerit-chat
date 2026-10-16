"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { useAccount } from "@/app/components/marketing/AccountState";
import ToolGlyph, { ToolLockIcon } from "@/app/components/ToolGlyph";
import ToolUnlockSheet from "@/app/components/ToolUnlockSheet";
import { ENGINEER_TOOLS } from "@/lib/engineerTools";
import { getMarketingContent } from "@/lib/marketing";
import { toolLabel } from "@/lib/labels";
import { HEADER_PLAN_ABBREV, PLAN_THEME, type SelfServePlanId } from "@/lib/plans";
import { hasToolAccess, toolRequiredPlan } from "@/lib/toolAccess";
import { useMessages } from "@/lib/useMessages";

export default function ToolsView() {
  const { locale } = useLocale();
  const { shell } = useMessages();
  const account = useAccount();
  const content = getMarketingContent(locale);
  const [unlockPlan, setUnlockPlan] = useState<SelfServePlanId | null>(null);

  return (
    <div className="page-wrap">
      <div className="advisor-breadcrumb">
        <Link href="/">{shell.nav.home}</Link>
        <span aria-hidden="true">›</span>
        <span>{content.nav.tools}</span>
      </div>
      <div className="advisor-title-row">
        <h1 className="page-title">{content.tools.title}</h1>
      </div>
      <p className="page-subtitle">{content.tools.intro}</p>
      <div className="advisor-grid">
        {ENGINEER_TOOLS.map((tool) => {
          const required = toolRequiredPlan(tool.id);
          const locked = account.signedIn && !hasToolAccess(account.planId, tool.id);
          const theme = PLAN_THEME[required];
          return (
            <article key={tool.id} className={"card advisor-card" + (locked ? " is-locked" : "")}>
              <div className="tool-tile-head">
                <h2>
                  <ToolGlyph id={tool.id} />
                  <span>{toolLabel(locale, tool.id)}</span>
                </h2>
                {locked ? (
                  <span className="tool-row-meta">
                    <ToolLockIcon />
                    <span className="tool-plan-pill" style={{ background: theme.soft, color: theme.accent }}>
                      {HEADER_PLAN_ABBREV[required]}
                    </span>
                  </span>
                ) : null}
              </div>
              <p>{content.tools.summaries[tool.id]}</p>
              <p className="advisor-included-on">{content.tools.availability[tool.id]}</p>
              <div className="advisor-card-actions">
                {locked ? (
                  <button type="button" className="advisor-card-link" onClick={() => setUnlockPlan(required)}>
                    {shell.nav.chat}
                  </button>
                ) : (
                  <Link className="advisor-card-link" href={`/chat?tool=${tool.id}`}>
                    {shell.nav.chat}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {unlockPlan ? <ToolUnlockSheet planId={unlockPlan} onClose={() => setUnlockPlan(null)} /> : null}
    </div>
  );
}
