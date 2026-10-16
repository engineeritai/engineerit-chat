"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";

export default function EnterprisePaidPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [message, setMessage] = useState("Confirming the Moyasar payment…");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkoutId = new URLSearchParams(window.location.search).get("checkout") || "";
    let cancelled = false;

    async function confirm() {
      await Promise.resolve();
      if (cancelled) return;
      if (!checkoutId) {
        setMessage("");
        setError("This page is missing the payment reference.");
        return;
      }
      const res = await fetch("/api/payments/moyasar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setMessage("");
        setError(json.error || "Moyasar has not confirmed this payment yet.");
        return;
      }
      setMessage(
        "Moyasar confirmed the payment. Enterprise access is active for the email on the quote, and a VAT-inclusive receipt has been sent."
      );
    }

    void confirm();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Enterprise payment</h1>
          {message && <p>{message}</p>}
          {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
          <p style={{ marginTop: 16 }}>
            <Link href="/login" className="btn" style={{ display: "inline-block" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
