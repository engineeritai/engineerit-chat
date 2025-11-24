"use client";

import { useState } from "react";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

type Props = {
  planId: PlanId;
  label: string;
  userId?: string | null;
};

export default function SubscribeButton({ planId, label, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleClick = async () => {
    if (!userId) {
      setStatus("Not authenticated");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Subscription failed.");
        return;
      }

      setStatus("Plan updated.");
      // Optional: refresh page to show new plan badge / dates
      window.location.reload();
    } catch (err) {
      console.error(err);
      setStatus("Unexpected error while updating subscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column" }}>
      <button
        type="button"
        className="btn"
        onClick={handleClick}
        disabled={loading || !userId}
        style={{ paddingInline: 18, fontSize: 13 }}
      >
        {loading ? "Updating…" : label}
      </button>
      {status && (
        <span
          style={{
            marginTop: 4,
            fontSize: 11,
            color: status === "Plan updated." ? "#16a34a" : "#b91c1c",
          }}
        >
          {status}
        </span>
      )}
    </div>
  );
}
