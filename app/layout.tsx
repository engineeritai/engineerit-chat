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
  title: "engineerit chat",
  description: "AI assistant for engineers",

  openGraph: {
    title: "engineerit chat",
    description: "AI assistant for engineers",
    url: "https://engineerit.ai",
    siteName: "engineerit",
    images: [
      {
        url: "https://engineerit.ai/og.png",
        width: 1200,
        height: 630,
        alt: "engineerit og image",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "engineerit chat",
    description: "AI assistant for engineers",
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
      <body className={`${poppins.className} bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
