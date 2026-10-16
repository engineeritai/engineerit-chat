import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Payment successful",
  description: "Your engineerit.ai payment completed.",
  path: "/payment/success",
  index: false,
});

export default function PaymentSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
