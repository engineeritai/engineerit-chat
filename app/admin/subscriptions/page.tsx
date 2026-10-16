"use client";

import { useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

export default function AdminSubscriptionsPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [plan, setPlan] = useState<"team" | "enterprise">("enterprise");
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [seats, setSeats] = useState("5");
  const [amountSar, setAmountSar] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Sign in with an admin account first.");
        return;
      }
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          company,
          plan,
          interval,
          seats: Number(seats),
          amountSar: amountSar.trim() === "" ? undefined : Number(amountSar),
          periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not activate the subscription.");
        return;
      }
      setInfo(
        json.pending
          ? json.message || "Stored until that email creates an account."
          : "Subscription activated."
      );
    } catch (err) {
      console.error(err);
      setError("Could not activate the subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Activate a subscription</h1>
          <p className="page-subtitle">
            For invoice and bank-transfer customers. Your sign-in email must be listed in
            the ADMIN_EMAILS environment variable. This does not charge Moyasar.
          </p>

          <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
            <div className="form-row">
              <label>
                Customer email
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Company
                <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Plan
                <select className="select" value={plan} onChange={(e) => setPlan(e.target.value as "team" | "enterprise")}>
                  <option value="team">Team</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Billing period
                <select className="select" value={interval} onChange={(e) => setInterval(e.target.value as "month" | "year")}>
                  <option value="month">Monthly</option>
                  <option value="year">Annual</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Seats
                <input className="input" type="number" min={1} required value={seats} onChange={(e) => setSeats(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                Amount (SAR, optional)
                <input
                  className="input"
                  inputMode="decimal"
                  value={amountSar}
                  onChange={(e) => setAmountSar(e.target.value)}
                  placeholder="Leave blank to use the list price"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Access until (optional)
                <input className="input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </label>
            </div>

            {error && <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p>}
            {info && <p style={{ color: "#166534", fontSize: 14 }}>{info}</p>}

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Activate"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
