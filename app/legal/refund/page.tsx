import Link from "next/link";

export default function RefundPage() {
  return (
    <div className="page-wrap" style={{ padding: "40px 20px" }}>
      <h1 className="page-title">Refund &amp; Cancellation Policy – engineerit.ai</h1>

      <p style={{ marginTop: 16, marginBottom: 16 }}>
        This page describes the Refund and Cancellation Policy for{" "}
        <strong>engineerit.ai</strong>.
      </p>

      <p style={{ marginBottom: 12 }}>
        The full and detailed Refund Policy is available in our main legal
        document here:
      </p>

      <ul style={{ marginLeft: 20, marginBottom: 16 }}>
        <li>
          <Link href="/legal/terms#refund">
            Go to Refund Policy section inside the Legal page
          </Link>
        </li>
      </ul>

      <p style={{ fontSize: 14, color: "#6b7280" }}>
        This dedicated URL is provided to meet payment provider and compliance
        requirements. The governing legal text is the same as in the Legal /
        Terms page.
      </p>
    </div>
  );
}
