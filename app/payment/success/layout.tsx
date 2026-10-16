import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/payment/success");
  return pageMetadata({ ...meta, path: "/payment/success", index: false, locale });
}

export default function PaymentSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
