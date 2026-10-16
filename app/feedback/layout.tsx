import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Feedback",
  description: "Send feedback or a complaint about engineerit.ai.",
  path: "/feedback",
});

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
