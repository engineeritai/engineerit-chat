import type { MetadataRoute } from "next";
import { SITEMAP_PAGES, languageAlternates } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return SITEMAP_PAGES.flatMap((page) => {
    const alternates = languageAlternates(page.path, "en");
    const languages = {
      en: alternates.languages.en,
      ar: alternates.languages.ar,
      "x-default": alternates.languages["x-default"],
    };
    return (["en", "ar"] as const).map((locale) => ({
      url: languages[locale],
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages },
    }));
  });
}
