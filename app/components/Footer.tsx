"use client";

import Link from "next/link";
import { useMessages } from "@/lib/useMessages";

export default function Footer() {
  const { shell: s } = useMessages();
  return (
    <footer
      style={{
        padding: "24px",
        textAlign: "center",
        fontSize: "13px",
        color: "#777",
        marginTop: "283px",
      }}
    >
      <p>{s.footer.blurb}</p>
      <p style={{ marginTop: "6px" }}>
        © {new Date().getFullYear()} engineerit. {s.footer.rights}
      </p>
      <p style={{ marginTop: "6px" }}>
        {s.footer.policyLead}{" "}
        <Link href="/legal/terms">{s.footer.policyLink}</Link>
      </p>
    </footer>
  );
}
