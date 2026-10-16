"use client";

import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { ENGINEER_TOOLS } from "@/lib/engineerTools";
import { getMarketingContent } from "@/lib/marketing";
import { toolLabel } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";

export default function ToolsView() {
  const { locale } = useLocale();
  const { shell } = useMessages();
  const content = getMarketingContent(locale);

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
        {ENGINEER_TOOLS.map((tool) => (
          <article key={tool.id} className="card advisor-card">
            <h2>{toolLabel(locale, tool.id)}</h2>
            <p>{content.tools.summaries[tool.id]}</p>
            <p className="advisor-included-on">{content.tools.availability[tool.id]}</p>
            <div className="advisor-card-actions">
              <Link className="advisor-card-link" href={`/chat?tool=${tool.id}`}>
                {shell.nav.chat}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
