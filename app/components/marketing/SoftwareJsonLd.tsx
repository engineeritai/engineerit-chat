"use client";

import JsonLd from "@/app/components/marketing/JsonLd";
import { useLocale } from "@/app/components/LocaleProvider";
import { softwareApplicationJsonLd } from "@/lib/seo";

export default function SoftwareJsonLd() {
  const { locale } = useLocale();
  return <JsonLd data={softwareApplicationJsonLd(locale)} />;
}
