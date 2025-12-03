// app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "engineerit",
  description: "AI Engineering Assistant",
  openGraph: {
    title: "engineerit",
    description: "AI Engineering Assistant",
    url: "https://engineerit.ai",
    siteName: "engineerit.ai",
    images: ["https://engineerit.ai/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "engineerit",
    description: "AI Engineering Assistant",
    images: ["https://engineerit.ai/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* Open Graph */}
        <meta property="og:title" content="engineerit" />
        <meta property="og:description" content="AI Engineering Assistant" />
        <meta property="og:image" content="https://engineerit.ai/og.png" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://engineerit.ai" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="engineerit" />
        <meta name="twitter:description" content="AI Engineering Assistant" />
        <meta name="twitter:image" content="https://engineerit.ai/og.png" />

        {/* HubSpot Tracking Code */}
        <script
          type="text/javascript"
          id="hs-script-loader"
          async
          defer
          src={`//js.hs-scripts.com/147368055.js`}
        ></script>
      </head>

      <body className={`${poppins.className} bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
