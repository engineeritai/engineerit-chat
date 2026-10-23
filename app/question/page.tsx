import MarketingShell from "@/app/components/marketing/MarketingShell";
import QuestionView from "@/app/question/QuestionView";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/question");
  return pageMetadata({ ...meta, path: "/question", locale });
}

export default function QuestionPage() {
  return (
    <MarketingShell>
      <QuestionView />
    </MarketingShell>
  );
}
