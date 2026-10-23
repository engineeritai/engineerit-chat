import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/feedback/review");
  return pageMetadata({ ...meta, path: "/feedback/review", locale, index: false });
}

export default function FeedbackReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
