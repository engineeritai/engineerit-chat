import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/subscription");
  return pageMetadata({ ...meta, path: "/subscription", index: false, locale });
}

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
