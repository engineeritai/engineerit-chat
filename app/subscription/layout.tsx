import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Subscription",
  description: "Choose or change an individual engineerit.ai plan.",
  path: "/subscription",
  index: false,
});

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
