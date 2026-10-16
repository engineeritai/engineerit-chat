"use client";

import { useMessages } from "@/lib/useMessages";

/** engineerit AI > AI Advisors (four tracks) > outcomes */
export default function AdvisorEcosystem({ compact = false }: { compact?: boolean }) {
  const { m } = useMessages();

  if (compact) {
    return (
      <section className="advisor-ecosystem advisor-ecosystem-compact" aria-label={m.advisors.ecosystemTitle}>
        <p className="advisor-ecosystem-line">
          <strong>{m.advisors.ecosystemAi}</strong>
          <span aria-hidden="true">›</span>
          <strong>{m.advisors.ecosystemAdvisors}</strong>
          <span>({m.advisors.ecosystemTracks})</span>
          <span aria-hidden="true">›</span>
          <strong>{m.advisors.ecosystemOutcomesLabel}</strong>
          <span>{m.advisors.ecosystemOutcomesShort}</span>
        </p>
      </section>
    );
  }
  return (
    <section className="advisor-ecosystem" aria-label={m.advisors.ecosystemTitle}>
      <h2 className="advisor-ecosystem-title">{m.advisors.ecosystemTitle}</h2>
      <ol className="advisor-ecosystem-flow">
        <li>
          <span className="advisor-ecosystem-step">{m.advisors.ecosystemAi}</span>
          <span className="advisor-ecosystem-detail">{m.advisors.ecosystem}</span>
        </li>
        <li>
          <span className="advisor-ecosystem-step">{m.advisors.ecosystemAdvisors}</span>
          <span className="advisor-ecosystem-detail">{m.advisors.ecosystemTracks}</span>
        </li>
        <li>
          <span className="advisor-ecosystem-step">{m.advisors.ecosystemOutcomesLabel}</span>
          <span className="advisor-ecosystem-detail">{m.advisors.ecosystemOutcomes}</span>
        </li>
      </ol>
    </section>
  );
}
