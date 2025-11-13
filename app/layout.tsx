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
  description: "An engineering assistant",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "engineerit chat",
    description: "AI assistant for engineers",
    url: "https://engineerit.ai",
    siteName: "engineerit",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "engineerit logo",
      },
    ],
    type: "website",
  },
};
