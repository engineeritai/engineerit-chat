// app/layout.tsx

import "./globals.css";
import "./design.css";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { LocaleProvider } from "@/app/components/LocaleProvider";
import Attribution from "@/app/components/Attribution";
import KeyboardInset from "@/app/components/KeyboardInset";
import PwaRegister from "@/app/components/PwaRegister";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { SITE_NAME, SITE_URL, languageAlternates } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/");
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: meta.title,
      template: "%s | engineerit.ai",
    },
    description: meta.description,
    applicationName: "engineer it",
    alternates: languageAlternates("/"),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [{ url: "/og.png", alt: SITE_NAME }],
      type: "website",
      locale: locale === "ar" ? "ar_SA" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: ["/og.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
        { url: "/favicon.png", type: "image/png", media: "(prefers-color-scheme: light)" },
        { url: "/icon.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: light)" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png", media: "(prefers-color-scheme: light)" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png", media: "(prefers-color-scheme: light)" },
        { url: "/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
        { url: "/favicon-dark.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
        { url: "/icon-192-dark.png", sizes: "192x192", type: "image/png", media: "(prefers-color-scheme: dark)" },
        { url: "/icon-512-dark.png", sizes: "512x512", type: "image/png", media: "(prefers-color-scheme: dark)" },
        { url: "/favicon.ico" },
      ],
      shortcut: "/favicon.png",
      apple: [
        { url: "/apple-touch-icon.png", media: "(prefers-color-scheme: light)" },
        { url: "/apple-touch-icon-dark.png", media: "(prefers-color-scheme: dark)" },
      ],
    },
    appleWebApp: {
      capable: true,
      title: "engineer it",
      statusBarStyle: "default",
      startupImage: [
        { url: "/splash-se.png", media: "(device-width: 375px) and (device-height: 667px)" },
        { url: "/splash-phone.png", media: "(device-width: 390px) and (device-height: 844px)" },
        { url: "/splash-max.png", media: "(device-width: 430px) and (device-height: 932px)" },
      ],
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await requestLocale();
  return (
    <html lang={locale === "ar" ? "ar" : "en"} dir={locale === "ar" ? "rtl" : "ltr"}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="engineer it" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon.png" type="image/png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon-dark.png" type="image/png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-dark.png" media="(prefers-color-scheme: dark)" />
        <script
          type="text/javascript"
          id="hs-script-loader"
          async
          defer
          src="//js.hs-scripts.com/147368055.js"
        />
      </head>

      <body className={`${inter.variable} ${plexArabic.variable}`}>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        <KeyboardInset />
        <PwaRegister />
        <Attribution />
        <Analytics />
      </body>
    </html>
  );
}
