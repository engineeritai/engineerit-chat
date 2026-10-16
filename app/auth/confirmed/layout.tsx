import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/auth/confirmed");
  return pageMetadata({ ...meta, path: "/auth/confirmed", index: false, locale });
}

export default function AuthConfirmedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
