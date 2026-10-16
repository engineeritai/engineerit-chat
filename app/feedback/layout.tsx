import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/feedback");
  return pageMetadata({ ...meta, path: "/feedback", locale });
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
