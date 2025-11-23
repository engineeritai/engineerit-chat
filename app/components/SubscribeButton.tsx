"use client";

import { useState } from "react";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

type Props = {
  planId: PlanId;
  label: string;
  userId: string; // we will pass this from profile/page.tsx
};

export default function SubscribeButton({ planId, label, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setStatus(
          body?.error || "Could not update your plan. Please try again."
        );
        return;
      }

      setStatus("Plan updated. Reloading…");
      // reload to show the new plan badge / info
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <button
        type="button"
        className="btn"
        style={{ paddingInline: 16, fontSize: 14 }}
        disabled={loading || !userId}
        onClick={handleClick}
      >
        {loading ? "Processing…" : label}
      </button>

      {status && (
        <span style={{ fontSize: 11, color: "#6b7280" }}>{status}</span>
      )}
    </div>
  );
}
