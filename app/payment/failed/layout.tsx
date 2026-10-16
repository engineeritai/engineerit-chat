import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/payment/failed");
  return pageMetadata({ ...meta, path: "/payment/failed", index: false, locale });
}

export default function PaymentFailedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
