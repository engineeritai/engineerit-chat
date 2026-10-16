import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Advisors | engineerit.ai",
  description:
    "PMO, Assurance, Decision, and Supply Chain advisors. One-click playbooks turn uploaded files into export-ready reports.",
};

export default function AdvisorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
