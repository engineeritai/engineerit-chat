import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Reset password",
  description: "Set a new password for your engineerit.ai account.",
  path: "/reset-password",
  index: false,
});

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
