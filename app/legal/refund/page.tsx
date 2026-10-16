"use client";

import Link from "next/link";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { useMessages } from "@/lib/useMessages";

export default function RefundPage() {
  const { shell: s } = useMessages();
  return (
    <MarketingShell>
    <div className="page-wrap" style={{ padding: "40px 20px" }}>
      <h1 className="page-title">{s.legal.refundTitle}</h1>
      <p style={{ marginTop: 16, marginBottom: 16 }}>{s.legal.refundLead}</p>
      <p style={{ marginBottom: 12 }}>{s.legal.refundBody}</p>
      <ul style={{ marginInlineStart: 20, marginBottom: 16 }}>
        <li>
          <Link href="/legal/terms#refund">{s.legal.refundLink}</Link>
        </li>
      </ul>
      <p style={{ fontSize: 14, color: "#6b7280" }}>{s.legal.refundNote}</p>
    </div>
    </MarketingShell>
  );
}
