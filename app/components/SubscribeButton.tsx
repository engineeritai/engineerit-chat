"use client";

import { useState } from "react";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

interface SubscribeButtonProps {
  planId: PlanId;
  label: string;
}

export default function SubscribeButton({ planId, label }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Subscription failed");
      }

      setMessage("Subscription updated. Refreshing profile…");
      // refresh profile so plan + dates update
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Unable to update subscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn"
        style={{
          padding: "6px 12px",
          fontSize: 13,
          marginRight: 6,
          marginBottom: 4,
        }}
      >
        {loading ? "Processing…" : label}
      </button>
      {errorMessage && (
        <span style={{ fontSize: 11, color: "#b91c1c" }}>{errorMessage}</span>
      )}
      {message && (
        <span style={{ fontSize: 11, color: "#15803d" }}>{message}</span>
      )}
    </div>
  );
}
