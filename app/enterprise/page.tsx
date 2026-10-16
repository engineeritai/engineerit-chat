"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { displayFeatures, planPriceLabel } from "@/lib/pricingDisplay";

export default function EnterprisePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    setLoading(true);
    try {
      const res = await fetch("/api/enterprise/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          email,
          phone,
          seats: Number(seats),
        }),
      });
      const json = await res.json().catch(() => ({ error: "Could not send the request." }));
      if (!res.ok) {
        setError(json.error || "Could not send the request.");
        return;
      }
      setDone(true);
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setSeats("10");
    } catch (err) {
      console.error(err);
      setError("Could not send the request.");
    } finally {
      setLoading(false);
    }
  }

  const plan = PLANS.find((item) => item.id === "enterprise")!;
  const month = planPriceLabel("enterprise", "month");
  const year = planPriceLabel("enterprise", "year");
  const features = displayFeatures(plan, "month");

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Enterprise</h1>
          <p className="page-subtitle">
            {month.primary} (approx. {month.usd}), or {year.primary} (approx. {year.usd}).
            Prices include VAT. Tell us who to reach and how many seats
            you need. We email a Moyasar payment link for the quoted amount. The subscription
            starts after Moyasar confirms payment.
          </p>
          <ul style={{ margin: "0 0 16px", paddingLeft: 18, color: "#374151", fontSize: 14 }}>
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
            <div className="form-row">
              <label>
                Name
                <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Company
                <input className="input" required value={company} onChange={(e) => setCompany(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Email
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Phone
                <input className="input" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Seats
                <input
                  className="input"
                  type="number"
                  min={1}
                  required
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
              </label>
            </div>

            {error && <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p>}
            {done && (
              <p style={{ color: "#166534", fontSize: 14 }}>
                Request received. We will email a Moyasar payment link to the address you entered.
              </p>
            )}

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Request a Moyasar invoice"}
            </button>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <Link href="/pricing" className="link">
                Back to pricing
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
