import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/chat");
  return pageMetadata({ ...meta, path: "/chat", index: false, locale });
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
