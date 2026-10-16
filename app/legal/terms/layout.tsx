import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/legal/terms");
  return pageMetadata({ ...meta, path: "/legal/terms", locale });
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
