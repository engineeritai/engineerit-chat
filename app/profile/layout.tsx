import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "My profile",
  description: "Your engineerit.ai profile and account details.",
  path: "/profile",
  index: false,
});

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
