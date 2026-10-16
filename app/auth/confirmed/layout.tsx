import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Email confirmed",
  description: "Your engineerit.ai email address has been confirmed.",
  path: "/auth/confirmed",
  index: false,
});

export default function AuthConfirmedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
