"use client";

import Link from "next/link";
import { ADVISOR_IDS, hasAdvisorAccess } from "@/lib/advisors";
import { useMessages } from "@/lib/useMessages";

type Props = {
  planId: string;
  isGuest: boolean;
};

/** Layer above engineer tools on the main chat page. */
export default function AdvisorBar({ planId, isGuest }: Props) {
  const { m } = useMessages();

  return (
    <div className="advisor-bar">
      <div className="advisor-bar-label">
        <span>{m.advisors.sectionTitle}</span>
        <span className="advisor-bar-ecosystem">{m.advisors.ecosystem}</span>
      </div>
      <div className="advisor-bar-row">
        {ADVISOR_IDS.map((id) => {
          const enabled = hasAdvisorAccess(planId, id, isGuest);
          const copy = m.advisors.items[id];
          return (
            <Link
              key={id}
              href={`/advisors/${id}`}
              className={"advisor-chip" + (enabled ? "" : " advisor-chip-locked")}
              title={enabled ? copy.summary : m.gating.lockedBody}
            >
              {!enabled && <span className="tool-lock">🔒</span>}
              <span className="advisor-chip-track">{copy.track}</span>
              <span>{copy.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
