"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

type CodeRow = {
  id: string;
  code: string;
  label: string;
  discount_type: string;
  percent_off: number | null;
  amount_off_sar: number | null;
  free_months: number | null;
  plans: string[];
  intervals: string[];
  cycles: number;
  audience: string;
  domains: string[];
  active: boolean;
  max_uses: number | null;
  single_use: boolean;
  expires_at: string | null;
};

type RedemptionRow = {
  id: string;
  email: string | null;
  plan: string | null;
  status: string;
  list_amount_sar: number;
  discount_sar: number;
  charged_amount_sar: number;
  created_at: string;
  promo_codes: { code: string } | { code: string }[] | null;
};

const PLANS = ["engineer", "professional", "consultant", "team", "enterprise"];

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function describe(row: CodeRow) {
  if (row.discount_type === "percent") return `${row.percent_off}%`;
  if (row.discount_type === "fixed") return `${row.amount_off_sar} SAR off`;
  return `${row.free_months} free month(s)`;
}

function codeOf(row: RedemptionRow) {
  if (!row.promo_codes) return "";
  if (Array.isArray(row.promo_codes)) return row.promo_codes[0]?.code || "";
  return row.promo_codes.code || "";
}

export default function AdminCodesPage() {
  const [sidebar, setSidebar] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [form, setForm] = useState({
    code: "",
    label: "",
    discountType: "percent",
    percentOff: "10",
    amountOffSar: "",
    freeMonths: "1",
    plans: [] as string[],
    month: true,
    year: true,
    cycles: "1",
    maxUses: "",
    onePerUser: true,
    audience: "any",
    domains: "",
    expiresAt: "",
    note: "",
  });
  const [batch, setBatch] = useState({
    count: "25",
    prefix: "STU",
    discountType: "free_months",
    freeMonths: "1",
    percentOff: "10",
    plans: ["engineer"],
    domains: ".edu.sa",
    cycles: "1",
  });
  const [question, setQuestion] = useState({
    questionEn: "",
    questionAr: "",
    choicesEn: "",
    choicesAr: "",
    answerIndex: "0",
    rewardPercent: "10",
    validDays: "7",
    participationOnly: false,
  });

  async function load() {
    const headers = await authHeader();
    if (!headers) {
      setError("Sign in with an admin account.");
      return;
    }
    const [codeRes, redemptionRes] = await Promise.all([
      fetch("/api/admin/codes", { headers }),
      fetch("/api/admin/codes/redemptions", { headers }),
    ]);
    const codeJson = await codeRes.json().catch(() => ({}));
    const redemptionJson = await redemptionRes.json().catch(() => ({}));
    if (!codeRes.ok) {
      setError(codeJson.error || "Could not load codes.");
      return;
    }
    setCodes(codeJson.codes || []);
    setRedemptions(redemptionRes.ok ? redemptionJson.redemptions || [] : []);
    if (!redemptionRes.ok && redemptionJson.error) setError(redemptionJson.error);
  }

  useEffect(() => {
    void load();
  }, []);

  function togglePlan(plan: string, target: "form" | "batch") {
    if (target === "form") {
      setForm((current) => ({
        ...current,
        plans: current.plans.includes(plan) ? current.plans.filter((item) => item !== plan) : [...current.plans, plan],
      }));
      return;
    }
    setBatch((current) => ({
      ...current,
      plans: current.plans.includes(plan) ? current.plans.filter((item) => item !== plan) : [...current.plans, plan],
    }));
  }

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((value) => !value)} />
        <div className="page-wrap">
          <h1 className="page-title">Promo codes</h1>
          <p className="page-subtitle">
            Codes discount checkout only. List prices stay the same.{" "}
            <Link href="/admin/subscriptions">Billing monitor</Link>
            {" · "}
            <Link href="/question">Question of the week</Link>
          </p>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
          {notice ? <p style={{ color: "#047857" }}>{notice}</p> : null}

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Create a code</h2>
            <form
              className="promo-admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                void (async () => {
                  const headers = await authHeader();
                  if (!headers) return;
                  const intervals = [form.month ? "month" : "", form.year ? "year" : ""].filter(Boolean);
                  const res = await fetch("/api/admin/codes", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                      code: form.code,
                      label: form.label,
                      discountType: form.discountType,
                      percentOff: Number(form.percentOff),
                      amountOffSar: Number(form.amountOffSar),
                      freeMonths: Number(form.freeMonths),
                      plans: form.plans,
                      intervals,
                      cycles: Number(form.cycles),
                      maxUses: form.maxUses === "" ? null : Number(form.maxUses),
                      onePerUser: form.onePerUser,
                      audience: form.audience,
                      domains: form.domains.split(",").map((item) => item.trim()).filter(Boolean),
                      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
                      note: form.note,
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setError(json.error || "Could not create the code.");
                    return;
                  }
                  setError("");
                  setNotice(`Created ${json.code?.code || "code"}.`);
                  await load();
                })();
              }}
            >
              <label>Code <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Leave blank to generate" /></label>
              <label>Label <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label>
              <label>
                Discount
                <select
                  value={form.discountType}
                  onChange={(event) => {
                    const discountType = event.target.value;
                    setForm({
                      ...form,
                      discountType,
                      year: discountType === "free_months" ? false : form.year,
                    });
                  }}
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed SAR</option>
                  <option value="free_months">Free months</option>
                </select>
              </label>
              {form.discountType === "percent" ? (
                <label>Percent <input value={form.percentOff} onChange={(event) => setForm({ ...form, percentOff: event.target.value })} inputMode="numeric" /></label>
              ) : null}
              {form.discountType === "fixed" ? (
                <label>SAR off <input value={form.amountOffSar} onChange={(event) => setForm({ ...form, amountOffSar: event.target.value })} inputMode="decimal" /></label>
              ) : null}
              {form.discountType === "free_months" ? (
                <label>Free months <input value={form.freeMonths} onChange={(event) => setForm({ ...form, freeMonths: event.target.value })} inputMode="numeric" /></label>
              ) : null}
              <label>Cycles <input value={form.cycles} onChange={(event) => setForm({ ...form, cycles: event.target.value })} inputMode="numeric" /></label>
              <label>Max uses <input value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} placeholder="Unlimited" inputMode="numeric" /></label>
              <label>Expires <input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label>
              <label>
                Audience
                <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>
                  <option value="any">Anyone</option>
                  <option value="domain">Email domain</option>
                  <option value="lapsed">Lapsed subscribers</option>
                </select>
              </label>
              <label>Domains <input value={form.domains} onChange={(event) => setForm({ ...form, domains: event.target.value })} placeholder=".edu.sa, ksu.edu.sa" /></label>
              <label>Note <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
              <fieldset>
                <legend>Plans (empty means every paid plan)</legend>
                {PLANS.map((plan) => (
                  <label key={plan}>
                    <input type="checkbox" checked={form.plans.includes(plan)} onChange={() => togglePlan(plan, "form")} /> {plan}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Billing</legend>
                <label><input type="checkbox" checked={form.month} onChange={(event) => setForm({ ...form, month: event.target.checked })} /> Monthly</label>
                <label><input type="checkbox" checked={form.year} onChange={(event) => setForm({ ...form, year: event.target.checked })} /> Yearly</label>
                <label><input type="checkbox" checked={form.onePerUser} onChange={(event) => setForm({ ...form, onePerUser: event.target.checked })} /> One use per user</label>
              </fieldset>
              <button className="btn" type="submit">Create code</button>
            </form>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Student batch</h2>
            <p>Single-use codes. Add domains such as .edu.sa when the gift should only work on those emails.</p>
            <form
              className="promo-admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                void (async () => {
                  const headers = await authHeader();
                  if (!headers) return;
                  const res = await fetch("/api/admin/codes/batch", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                      count: Number(batch.count),
                      prefix: batch.prefix,
                      label: "Student gift",
                      discountType: batch.discountType,
                      freeMonths: Number(batch.freeMonths),
                      percentOff: Number(batch.percentOff),
                      plans: batch.plans,
                      intervals: ["month"],
                      cycles: Number(batch.cycles),
                      domains: batch.domains.split(",").map((item) => item.trim()).filter(Boolean),
                      audience: batch.domains.trim() ? "domain" : "batch",
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setError(json.error || "Could not generate the batch.");
                    return;
                  }
                  setError("");
                  setBatchCodes(json.codes || []);
                  setNotice(`Generated ${json.codes?.length || 0} codes.`);
                  await load();
                })();
              }}
            >
              <label>Count <input value={batch.count} onChange={(event) => setBatch({ ...batch, count: event.target.value })} inputMode="numeric" /></label>
              <label>Prefix <input value={batch.prefix} onChange={(event) => setBatch({ ...batch, prefix: event.target.value })} /></label>
              <label>
                Discount
                <select value={batch.discountType} onChange={(event) => setBatch({ ...batch, discountType: event.target.value })}>
                  <option value="free_months">Free months</option>
                  <option value="percent">Percent</option>
                </select>
              </label>
              {batch.discountType === "free_months" ? (
                <label>Free months <input value={batch.freeMonths} onChange={(event) => setBatch({ ...batch, freeMonths: event.target.value })} inputMode="numeric" /></label>
              ) : (
                <label>Percent <input value={batch.percentOff} onChange={(event) => setBatch({ ...batch, percentOff: event.target.value })} inputMode="numeric" /></label>
              )}
              <label>Cycles <input value={batch.cycles} onChange={(event) => setBatch({ ...batch, cycles: event.target.value })} inputMode="numeric" /></label>
              <label>Domains <input value={batch.domains} onChange={(event) => setBatch({ ...batch, domains: event.target.value })} placeholder=".edu.sa" /></label>
              <fieldset>
                <legend>Plans</legend>
                {PLANS.map((plan) => (
                  <label key={plan}>
                    <input type="checkbox" checked={batch.plans.includes(plan)} onChange={() => togglePlan(plan, "batch")} /> {plan}
                  </label>
                ))}
              </fieldset>
              <button className="btn" type="submit">Generate batch</button>
            </form>
            {batchCodes.length > 0 ? (
              <textarea readOnly value={batchCodes.join("\n")} rows={8} style={{ width: "100%", marginTop: 12 }} />
            ) : null}
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Codes</h2>
            {codes.length === 0 ? <p>No codes yet.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Code", "Offer", "Plans", "Audience", "Cycles", "Status", ""].map((header) => (
                        <th key={header} style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((row) => (
                      <tr key={row.id}>
                        <td style={{ padding: "6px 8px" }}>{row.code}</td>
                        <td style={{ padding: "6px 8px" }}>{describe(row)}</td>
                        <td style={{ padding: "6px 8px" }}>{row.plans.length ? row.plans.join(", ") : "all"}</td>
                        <td style={{ padding: "6px 8px" }}>{row.audience}{row.domains.length ? ` (${row.domains.join(", ")})` : ""}</td>
                        <td style={{ padding: "6px 8px" }}>{row.cycles}</td>
                        <td style={{ padding: "6px 8px" }}>{row.active ? "active" : "disabled"}</td>
                        <td style={{ padding: "6px 8px" }}>
                          {row.active ? (
                            <button
                              type="button"
                              className="btn btn-quiet"
                              onClick={() => {
                                void (async () => {
                                  const headers = await authHeader();
                                  if (!headers) return;
                                  const res = await fetch("/api/admin/codes/disable", {
                                    method: "POST",
                                    headers,
                                    body: JSON.stringify({ id: row.id }),
                                  });
                                  if (!res.ok) {
                                    const json = await res.json().catch(() => ({}));
                                    setError(json.error || "Could not disable the code.");
                                    return;
                                  }
                                  await load();
                                })();
                              }}
                            >
                              Disable
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Question of the week</h2>
            <form
              className="promo-admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                void (async () => {
                  const headers = await authHeader();
                  if (!headers) return;
                  const res = await fetch("/api/admin/question", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                      questionEn: question.questionEn,
                      questionAr: question.questionAr,
                      choicesEn: question.choicesEn.split("\n"),
                      choicesAr: question.choicesAr.split("\n"),
                      answerIndex: Number(question.answerIndex),
                      rewardPercent: Number(question.rewardPercent),
                      validDays: Number(question.validDays),
                      participationOnly: question.participationOnly,
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setError(json.error || "Could not publish the question.");
                    return;
                  }
                  setError("");
                  setNotice("Question published. The public page is /question.");
                })();
              }}
            >
              <label>English question <textarea value={question.questionEn} onChange={(event) => setQuestion({ ...question, questionEn: event.target.value })} rows={3} /></label>
              <label>Arabic question <textarea value={question.questionAr} onChange={(event) => setQuestion({ ...question, questionAr: event.target.value })} rows={3} /></label>
              <label>English choices, one per line <textarea value={question.choicesEn} onChange={(event) => setQuestion({ ...question, choicesEn: event.target.value })} rows={4} /></label>
              <label>Arabic choices, one per line <textarea value={question.choicesAr} onChange={(event) => setQuestion({ ...question, choicesAr: event.target.value })} rows={4} /></label>
              <label>Correct choice index <input value={question.answerIndex} onChange={(event) => setQuestion({ ...question, answerIndex: event.target.value })} inputMode="numeric" /></label>
              <label>Reward percent <input value={question.rewardPercent} onChange={(event) => setQuestion({ ...question, rewardPercent: event.target.value })} inputMode="numeric" /></label>
              <label>Code valid days <input value={question.validDays} onChange={(event) => setQuestion({ ...question, validDays: event.target.value })} inputMode="numeric" /></label>
              <label>
                <input type="checkbox" checked={question.participationOnly} onChange={(event) => setQuestion({ ...question, participationOnly: event.target.checked })} />
                Reward anyone who takes part, not only a correct answer
              </label>
              <button className="btn" type="submit">Publish question</button>
            </form>
          </section>

          <section className="card">
            <h2 className="section-heading" style={{ marginTop: 0 }}>Redemptions</h2>
            {redemptions.length === 0 ? <p>No redemptions yet.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["When", "Code", "Email", "Plan", "List", "Discount", "Charged", "Status"].map((header) => (
                        <th key={header} style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((row) => (
                      <tr key={row.id}>
                        <td style={{ padding: "6px 8px" }}>{new Date(row.created_at).toLocaleString("en-GB")}</td>
                        <td style={{ padding: "6px 8px" }}>{codeOf(row)}</td>
                        <td style={{ padding: "6px 8px" }}>{row.email || ""}</td>
                        <td style={{ padding: "6px 8px" }}>{row.plan || ""}</td>
                        <td style={{ padding: "6px 8px" }}>{row.list_amount_sar}</td>
                        <td style={{ padding: "6px 8px" }}>{row.discount_sar}</td>
                        <td style={{ padding: "6px 8px" }}>{row.charged_amount_sar}</td>
                        <td style={{ padding: "6px 8px" }}>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
