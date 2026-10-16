import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Advisors | engineerit.ai",
  description:
    "PMO, Program Assurance, and Decision Support advisors above engineerit chat and tools.",
};

export default function AdvisorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
