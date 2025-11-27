import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="page-wrap" style={{ padding: "40px 20px" }}>
      <h1 className="page-title">Privacy Policy – engineerit.ai</h1>

      <p style={{ marginTop: 16, marginBottom: 16 }}>
        This page describes the Privacy Policy for the{" "}
        <strong>engineerit.ai</strong> platform.
      </p>

      <p style={{ marginBottom: 12 }}>
        The full and detailed Privacy Policy is available in our legal
        document here:
      </p>

      <ul style={{ marginLeft: 20, marginBottom: 16 }}>
        <li>
          <Link href="/legal/terms#privacy">
            Go to Privacy Policy section inside the Legal page
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
