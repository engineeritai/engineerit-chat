import type { ReactNode } from "react";
import type { EngineerToolId } from "@/lib/engineerTools";

const common = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const paths: Record<EngineerToolId, ReactNode> = {
  drawing: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 15.5 10.2 12l2.1 2.4L16 9.5" />
    </>
  ),
  design: (
    <>
      <path d="M12 3 5 6.5v5.2c0 4.2 2.9 7.2 7 8.3 4.1-1.1 7-4.1 7-8.3V6.5L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  itp: (
    <>
      <path d="M8 4h8" />
      <path d="M9 4v2.2A2 2 0 0 0 9.6 7.6L11 9.2V20h2V9.2l1.4-1.6A2 2 0 0 0 15 6.2V4" />
      <path d="M9 14h6" />
    </>
  ),
  boq: (
    <>
      <path d="M7 4h10v16H7z" />
      <path d="M10 8h4M10 12h4M10 16h2" />
    </>
  ),
  schedule: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  value: (
    <>
      <path d="M12 3v18" />
      <path d="M8 7h6.5a2.5 2.5 0 0 1 0 5H9.5a2.5 2.5 0 0 0 0 5H16" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
      <rect x="13" y="10.5" width="7.5" height="10" rx="1.5" />
      <rect x="3.5" y="13.5" width="7.5" height="7" rx="1.5" />
    </>
  ),
};

export default function ToolGlyph({ id }: { id: EngineerToolId }) {
  return (
    <svg className="tool-glyph" {...common}>
      {paths[id]}
    </svg>
  );
}

export function ToolLockIcon() {
  return (
    <svg className="tool-lock" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
