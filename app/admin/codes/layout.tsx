import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promo codes",
  robots: { index: false, follow: false },
};

export default function AdminCodesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
