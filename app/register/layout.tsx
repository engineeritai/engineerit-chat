import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/register");
  return pageMetadata({ ...meta, path: "/register", locale });
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
