import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/auth/login");
  return pageMetadata({ ...meta, path: "/auth/login", index: false, locale });
}

export default function AuthLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
