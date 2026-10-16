import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Login",
  description: "Sign in to engineerit.ai.",
  path: "/auth/login",
  index: false,
});

export default function AuthLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
