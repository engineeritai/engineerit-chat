import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/reset-password");
  return pageMetadata({ ...meta, path: "/reset-password", index: false, locale });
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
