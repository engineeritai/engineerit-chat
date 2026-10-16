"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  seats: number;
  status?: string | null;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function AdminSubscriptionsPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadId, setLeadId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("2500");
  const [quoteInterval, setQuoteInterval] = useState<"month" | "year">("year");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [quoteInfo, setQuoteInfo] = useState("");

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/admin/enterprise-leads", { headers });
      const json = await res.json().catch(() => ({}));
      if (!cancelled && res.ok) setLeads(json.leads || []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = leads.find((lead) => lead.id === leadId);

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setQuoteError("");
    setQuoteInfo("");
    setPaymentUrl("");
    setQuoteLoading(true);
    try {
      const headers = await authHeader();
      if (!headers) {
        setQuoteError("Sign in with an admin account first.");
        return;
      }
      const res = await fetch("/api/admin/enterprise-invoice", {
        method: "POST",
        headers,
        body: JSON.stringify({
          leadId,
          amountSar: Number(quoteAmount),
          interval: quoteInterval,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQuoteError(json.error || "Could not create the Moyasar invoice.");
        return;
      }
      setPaymentUrl(json.url || "");
      setQuoteInfo(
        json.emailed
          ? "Payment link created and emailed to the lead."
          : "Payment link created. Email is not configured, so copy the link."
      );
    } catch (err) {
      console.error(err);
      setQuoteError("Could not create the Moyasar invoice.");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const headers = await authHeader();
      if (!headers) {
        setError("Sign in with an admin account first.");
        return;
      }
      const res = await fetch("/api/admin/activate", {
        method: "POST",
        headers,
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
          <h1 className="page-title">Enterprise payments</h1>
          <p className="page-subtitle">
            Create a Moyasar invoice for a custom amount and a sales lead. When Moyasar
            confirms payment, the enterprise subscription and its seat count turn on, and
            the customer receives a receipt. Your sign-in email must be in ADMIN_EMAILS.
          </p>

          <form className="card" onSubmit={createInvoice} style={{ maxWidth: 640, marginBottom: 24 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>
              Moyasar payment link
            </h2>
            <div className="form-row">
              <label>
                Lead
                <select className="select" required value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                  <option value="">Select a lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company} — {lead.email} — {lead.seats} seats
                      {lead.status ? ` (${lead.status})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selected && (
              <p style={{ fontSize: 14, color: "#374151" }}>
                {selected.name}, {selected.company}. This invoice activates {selected.seats} seats.
              </p>
            )}
            <div className="form-row">
              <label>
                Custom amount (SAR, VAT inclusive)
                <input
                  className="input"
                  inputMode="decimal"
                  required
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Billing period
                <select
                  className="select"
                  value={quoteInterval}
                  onChange={(e) => setQuoteInterval(e.target.value as "month" | "year")}
                >
                  <option value="month">Monthly</option>
                  <option value="year">Annual</option>
                </select>
              </label>
            </div>
            {quoteError && <p style={{ color: "#b91c1c", fontSize: 14 }}>{quoteError}</p>}
            {quoteInfo && <p style={{ color: "#166534", fontSize: 14 }}>{quoteInfo}</p>}
            {paymentUrl && (
              <p style={{ fontSize: 14 }}>
                <a href={paymentUrl}>{paymentUrl}</a>
              </p>
            )}
            <button className="btn" type="submit" disabled={quoteLoading}>
              {quoteLoading ? "Creating..." : "Create Moyasar invoice"}
            </button>
          </form>

          <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>
              Fallback activation
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              Use this only when a Moyasar payment cannot be confirmed automatically. It does
              not create a charge.
            </p>
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
              {loading ? "Saving..." : "Activate without Moyasar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
