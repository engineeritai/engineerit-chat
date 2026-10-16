import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | engineerit.ai",
  description:
    "engineerit.ai plan features, including AI Advisors on Consultant, Team, and Enterprise.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
