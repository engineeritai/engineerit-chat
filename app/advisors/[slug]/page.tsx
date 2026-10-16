"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import MarketingShell from "../../components/marketing/MarketingShell";
import AdvisorChat from "../../components/AdvisorChat";
import { isAdvisorId } from "@/lib/advisors";
import { useMessages } from "@/lib/useMessages";

export default function AdvisorModePage() {
  const params = useParams<{ slug: string }>();
  const { m } = useMessages();
  const slug = params?.slug;

  return (
    <MarketingShell>
      <div className="advisor-mode-page">
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
    </MarketingShell>
  );
}
