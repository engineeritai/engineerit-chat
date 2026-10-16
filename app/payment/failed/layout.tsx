import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Payment failed",
  description: "Your engineerit.ai payment did not complete.",
  path: "/payment/failed",
  index: false,
});

export default function PaymentFailedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
