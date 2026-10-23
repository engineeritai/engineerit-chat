import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/advisors", priority: 0.8, changeFrequency: "weekly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/question", priority: 0.6, changeFrequency: "weekly" },
    { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" },
    { path: "/guide", priority: 0.7, changeFrequency: "monthly" },
    { path: "/tools", priority: 0.7, changeFrequency: "monthly" },
    { path: "/register", priority: 0.7, changeFrequency: "monthly" },
    { path: "/login", priority: 0.5, changeFrequency: "monthly" },
    { path: "/feedback", priority: 0.4, changeFrequency: "yearly" },
    { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/refund", priority: 0.3, changeFrequency: "yearly" },
  ];

  return pages.map((page) => {
    const url = page.path === "/" ? `${SITE_URL}/` : new URL(page.path, SITE_URL).toString();
    const withLang = (lang: "en" | "ar") => {
      const localized = new URL(page.path === "/" ? "/" : page.path, SITE_URL);
      localized.searchParams.set("lang", lang);
      return localized.toString();
    };
    return {
      url,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          en: withLang("en"),
          ar: withLang("ar"),
        },
      },
    };
  });
}
