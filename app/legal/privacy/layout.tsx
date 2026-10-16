import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/legal/privacy");
  return pageMetadata({ ...meta, path: "/legal/privacy", locale });
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
