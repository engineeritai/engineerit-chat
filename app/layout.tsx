// app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Footer from "./components/Footer";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "engineerit chat",
  description: "AI assistant for engineers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Open Graph Meta */}
        <meta property="og:title" content="engineerit chat" />
        <meta property="og:description" content="AI assistant for engineers" />
        <meta property="og:image" content="https://engineerit.ai/og.png" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://engineerit.ai" />

        {/* Twitter Card Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="engineerit chat" />
        <meta name="twitter:description" content="AI assistant for engineers" />
        <meta name="twitter:image" content="https://engineerit.ai/og.png" />
      </head>

      <body className={`${poppins.className} bg-gray-50 text-gray-900`}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
