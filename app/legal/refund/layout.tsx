import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/legal/refund");
  return pageMetadata({ ...meta, path: "/legal/refund", locale });
}

export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
