"use client";

import { useState } from "react";
import { plans } from "@/lib/subscriptions";

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");

  async function handleSelect(planId: string) {
    setLoading(true);
    setSelected(planId);

    await fetch("/api/subscription/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });

    setLoading(false);
  }

  return (
    <div className="page-wrap" style={{ padding: "40px 20px" }}>
      <h1 className="page-title">Plans & Subscription</h1>

      <p style={{ marginBottom: 30, color: "#555", fontSize: 16 }}>
        Choose your level: Assistant, Engineer, Professional, or Consultant.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
        }}
      >
        {plans.map((p) => {
          const isSelected = selected === p.id;

          return (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: "1px solid #e5e7eb",
                boxShadow: isSelected
                  ? "0 0 0 3px rgba(37,99,235,0.4)"
                  : "0 1px 2px rgba(0,0,0,0.05)",
                transition: "0.2s",
              }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>{p.name}</h2>

              <p style={{ marginTop: 8, color: "#6b7280", fontSize: 15 }}>
                {p.description}
              </p>

              <p style={{ marginTop: 14, fontSize: 22, fontWeight: 700 }}>
                {p.price === 0 ? "Free" : `${p.price} SAR / month`}
              </p>

              <button
                onClick={() => handleSelect(p.id)}
                disabled={loading && isSelected}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 12,
                  background:
                    loading && isSelected ? "#93c5fd" : "#2563eb",
                  color: "#fff",
                  fontSize: 15,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loading && isSelected
                  ? "Saving..."
                  : isSelected
                  ? "Selected ✓"
                  : "Select"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
