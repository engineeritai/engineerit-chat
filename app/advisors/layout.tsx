import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/advisors");
  return pageMetadata({ ...meta, path: "/advisors", locale });
}

export default function AdvisorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
