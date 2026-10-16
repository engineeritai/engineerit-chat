"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import PlanCatalog from "../components/PlanCatalog";
import { useMessages } from "@/lib/useMessages";

export default function SubscriptionPage() {
  const { shell: s } = useMessages();
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">{s.subscription.title}</h1>
          <p className="page-subtitle">{s.subscription.lead}</p>
          <PlanCatalog heading={s.subscription.title} />
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
            <Link
              href="/profile"
              className="btn"
              style={{
                textDecoration: "none",
                padding: "10px 20px",
                borderRadius: 9999,
                backgroundColor: "#e5e7eb",
                color: "#111827",
                borderColor: "#e5e7eb",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {s.subscription.back}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
