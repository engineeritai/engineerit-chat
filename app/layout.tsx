import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "engineerit chat",
  description: "AI chat for engineers – engineerit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Center EVERYTHING vertically & horizontally */}
      <body className="min-h-screen bg-white text-gray-900 antialiased flex items-center justify-center">
        {children}
      </body>
    </html>
  );
}
