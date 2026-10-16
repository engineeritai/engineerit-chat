import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/profile");
  return pageMetadata({ ...meta, path: "/profile", index: false, locale });
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
