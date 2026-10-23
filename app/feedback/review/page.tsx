"use client";

import { useState } from "react";
import Link from "next/link";
import MarketingShell from "../../components/marketing/MarketingShell";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";

export default function FeedbackReviewPage() {
  const { shell: s } = useMessages();
  const copy = s.feedback.review;
  const [rating, setRating] = useState<number | null>(null);
  const [liked, setLiked] = useState("");
  const [improve, setImprove] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error" | "auth" | "unavailable">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("auth");
      return;
    }
    try {
      const res = await fetch("/api/feedback/platform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          liked,
          improve,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401 || json.error === "auth") {
        setStatus("auth");
        return;
      }
      if (json.error === "unavailable") {
        setStatus("unavailable");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
      setLiked("");
      setImprove("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <MarketingShell>
      <div className="page-wrap">
        <div className="advisor-breadcrumb">
          <Link href="/">{s.nav.home}</Link>
          <span aria-hidden="true">›</span>
          <Link href="/feedback">{s.feedback.title}</Link>
          <span aria-hidden="true">›</span>
          <span>{copy.title}</span>
        </div>
        <h1 className="page-title">{copy.title}</h1>
        <p className="page-subtitle">{copy.lead}</p>
        <form className="card" onSubmit={handleSubmit}>
          <fieldset className="form-row" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend>{copy.rating}</legend>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    required
                    checked={rating === value}
                    onChange={() => {
                      setRating(value);
                      setStatus("idle");
                    }}
                  />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-row">
            <label>
              {copy.liked} ({copy.optional})
              <textarea
                className="textarea"
                name="liked"
                rows={4}
                maxLength={2000}
                value={liked}
                onChange={(event) => {
                  setLiked(event.target.value);
                  setStatus("idle");
                }}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              {copy.improve} ({copy.optional})
              <textarea
                className="textarea"
                name="improve"
                rows={4}
                maxLength={2000}
                value={improve}
                onChange={(event) => {
                  setImprove(event.target.value);
                  setStatus("idle");
                }}
              />
            </label>
          </div>
          <button className="btn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? copy.sending : copy.submit}
          </button>
          {status === "done" ? (
            <p style={{ fontSize: 13, color: "#16a34a", marginTop: 8 }}>{copy.thanks}</p>
          ) : null}
          {status === "error" ? (
            <p style={{ fontSize: 13, color: "#b91c1c", marginTop: 8 }}>{copy.error}</p>
          ) : null}
          {status === "unavailable" ? (
            <p style={{ fontSize: 13, marginTop: 8 }}>{copy.unavailable}</p>
          ) : null}
          {status === "auth" ? (
            <p style={{ fontSize: 13, marginTop: 8 }}>
              {copy.signInLead}{" "}
              <Link href="/login?next=%2Ffeedback%2Freview">{copy.signIn}</Link>
            </p>
          ) : null}
        </form>
      </div>
    </MarketingShell>
  );
}
