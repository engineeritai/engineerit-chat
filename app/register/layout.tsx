import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Register",
  description:
    "Create an engineerit.ai account. Assistant Engineer is free. Engineer is SAR 19/month, Professional Engineer SAR 41/month, and Consultant Engineer SAR 79/month.",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
