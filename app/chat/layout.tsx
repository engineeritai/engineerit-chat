import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Chat",
  description:
    "Open the engineerit.ai chat. Choose a discipline and ask an engineering question, or start from an engineer tool.",
  path: "/chat",
  index: false,
});

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
