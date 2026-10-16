import type { ReactNode } from "react";
import type { AdvisorId } from "@/lib/advisors";

const common = {
  className: "tool-glyph",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const paths: Record<AdvisorId, ReactNode> = {
  pmo: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 12h8M8 15h5" />
    </>
  ),
  assurance: (
    <>
      <path d="M12 3 5 6.2v5.1c0 4 2.8 6.9 7 8.2 4.2-1.3 7-4.2 7-8.2V6.2L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  operations: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </>
  ),
  decision: (
    <>
      <path d="M12 3v18" />
      <path d="M12 6h6l-1.2 3.2L18 12h-6" />
      <path d="M12 6H6l1.2 3.2L6 12h6" />
    </>
  ),
};

export default function AdvisorGlyph({ id }: { id: AdvisorId }) {
  return <svg {...common}>{paths[id]}</svg>;
}

export function AdvisorsMenuGlyph() {
  return (
    <svg {...common}>
      <circle cx="8" cy="9" r="2.2" />
      <circle cx="16" cy="9" r="2.2" />
      <path d="M4.5 17.5c.6-2 2.2-3 3.5-3s2.9 1 3.5 3" />
      <path d="M12.5 17.5c.6-2 2.2-3 3.5-3s2.9 1 3.5 3" />
    </svg>
  );
}
