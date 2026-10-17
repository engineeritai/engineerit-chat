import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/forgot-password");
  return pageMetadata({ ...meta, path: "/forgot-password", index: false, locale });
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
