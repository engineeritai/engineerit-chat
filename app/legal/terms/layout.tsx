import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "User Policy & Agreement",
  description:
    "Terms, privacy summary, and liability limits for using engineerit.ai.",
  path: "/legal/terms",
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
