import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "engineerit chat",
  description: "AI chat for engineers – powered by Engineerit",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">{children}</body>
    </html>
  );
}
