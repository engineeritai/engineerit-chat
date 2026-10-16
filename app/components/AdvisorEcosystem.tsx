"use client";

import { ADVISOR_IDS } from "@/lib/advisors";
import { useMessages } from "@/lib/useMessages";

/** engineerit AI > PMO > Supply Chain > Program Assurance > Decision Support */
export default function AdvisorEcosystem({ compact = false }: { compact?: boolean }) {
  const { m } = useMessages();
  const steps = ADVISOR_IDS.map((id) => m.advisors.items[id].flowLabel);

  if (compact) {
    return (
      <section className="advisor-ecosystem advisor-ecosystem-compact" aria-label={m.advisors.ecosystemTitle}>
        <p className="advisor-ecosystem-line">
          <strong>{m.advisors.ecosystemAi}</strong>
          {steps.map((step) => (
            <span key={step} className="advisor-ecosystem-piece">
              <span aria-hidden="true">›</span>
              <strong>{step}</strong>
            </span>
          ))}
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
          <span className="advisor-ecosystem-detail">{m.advisors.sectionTitle}</span>
        </li>
        {ADVISOR_IDS.map((id) => {
          const copy = m.advisors.items[id];
          return (
            <li key={id}>
              <span className="advisor-ecosystem-step">{copy.flowLabel}</span>
              <span className="advisor-ecosystem-detail">{copy.name}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
