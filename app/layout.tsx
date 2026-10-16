// app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { LocaleProvider } from "@/app/components/LocaleProvider";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { SITE_NAME, SITE_URL, languageAlternates } from "@/lib/seo";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

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
  applicationName: SITE_NAME,
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
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
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
        {/* HubSpot tracking. Public site id, already used in production. */}
        <script
          type="text/javascript"
          id="hs-script-loader"
          async
          defer
          src="//js.hs-scripts.com/147368055.js"
        />
      </head>

      <body className={`${poppins.className} bg-gray-50 text-gray-900`}>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
