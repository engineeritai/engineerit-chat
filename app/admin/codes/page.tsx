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

type StudentDoc = {
  id: string;
  userId: string;
  fileName: string;
  url: string | null;
  createdAt: string;
};

const STUDENT_PRESET = {
  code: "STUDENT50",
  label: "Student 50%",
  discountType: "percent",
  percentOff: "50",
  amountOffSar: "",
  freeMonths: "1",
  plans: ["engineer"],
  month: true,
  year: false,
  cycles: "12",
  maxUses: "",
  onePerUser: true,
  audience: "any",
  domains: "",
  expiresAt: "",
  note: "50% off Engineer monthly after student verification.",
  requiresStudent: true,
};

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
  const [pendingMigration, setPendingMigration] = useState(false);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [studentDocs, setStudentDocs] = useState<StudentDoc[]>([]);
  const [studentUnavailable, setStudentUnavailable] = useState(false);
  const [domain, setDomain] = useState("");
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
    requiresStudent: false,
  });
  const [batch, setBatch] = useState({
    count: "25",
    prefix: "STU",
    percentOff: "50",
    cycles: "12",
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
    const [codeRes, redemptionRes, studentRes] = await Promise.all([
      fetch("/api/admin/codes", { headers }),
      fetch("/api/admin/codes/redemptions", { headers }),
      fetch("/api/admin/students", { headers }),
    ]);
    const codeJson = await codeRes.json().catch(() => ({}));
    const redemptionJson = await redemptionRes.json().catch(() => ({}));
    const studentJson = await studentRes.json().catch(() => ({}));
    if (studentJson.unavailable) {
      setStudentUnavailable(true);
      setStudentDocs([]);
    } else if (studentRes.ok) {
      setStudentUnavailable(false);
      setStudentDocs(studentJson.documents || []);
    }
    if (codeJson.unavailable || redemptionJson.unavailable) {
      setPendingMigration(true);
      setError("");
      setCodes([]);
      setRedemptions([]);
      return;
    }
    setPendingMigration(false);
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

  function togglePlan(plan: string) {
    setForm((current) => ({
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
          {pendingMigration ? (
            <p>
              Promo tables are not in this database yet. Apply supabase/migrations/20261023170000_promo_codes.sql, then reload.
              Checkout still works without codes.
            </p>
          ) : null}
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
                      requiresStudent: form.requiresStudent,
                      audience: form.audience,
                      domains: form.domains.split(",").map((item) => item.trim()).filter(Boolean),
                      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
                      note: form.note,
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (json.unavailable) {
                    setPendingMigration(true);
                    setError("");
                    return;
                  }
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
                    <input type="checkbox" checked={form.plans.includes(plan)} onChange={() => togglePlan(plan)} /> {plan}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Billing</legend>
                <label><input type="checkbox" checked={form.month} onChange={(event) => setForm({ ...form, month: event.target.checked })} /> Monthly</label>
                <label><input type="checkbox" checked={form.year} onChange={(event) => setForm({ ...form, year: event.target.checked })} /> Yearly</label>
                <label><input type="checkbox" checked={form.onePerUser} onChange={(event) => setForm({ ...form, onePerUser: event.target.checked })} /> One use per user</label>
                <label><input type="checkbox" checked={form.requiresStudent} onChange={(event) => setForm({ ...form, requiresStudent: event.target.checked })} /> Verified student required</label>
              </fieldset>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  className="btn btn-quiet"
                  type="button"
                  onClick={() => setForm(STUDENT_PRESET)}
                >
                  Student
                </button>
                <button className="btn" type="submit">Create code</button>
              </div>
            </form>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Student batch</h2>
            <p>
              Single-use codes for the Engineer plan, monthly, at 50% for 12 cycles. Each code works only after a verified university email or an approved student letter.
            </p>
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
                      label: "Student 50%",
                      percentOff: Number(batch.percentOff),
                      cycles: Number(batch.cycles),
                      requiresStudent: true,
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (json.unavailable) {
                    setPendingMigration(true);
                    setError("");
                    return;
                  }
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
              <label>Percent <input value={batch.percentOff} onChange={(event) => setBatch({ ...batch, percentOff: event.target.value })} inputMode="numeric" /></label>
              <label>Monthly cycles <input value={batch.cycles} onChange={(event) => setBatch({ ...batch, cycles: event.target.value })} inputMode="numeric" /></label>
              <button className="btn" type="submit">Generate batch</button>
            </form>
            {batchCodes.length > 0 ? (
              <textarea readOnly value={batchCodes.join("\n")} rows={8} style={{ width: "100%", marginTop: 12 }} />
            ) : null}
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Codes</h2>
            {codes.length === 0 && !pendingMigration ? <p>No codes yet.</p> : null}
            {codes.length > 0 ? (
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
                                  const json = await res.json().catch(() => ({}));
                                  if (json.unavailable) {
                                    setPendingMigration(true);
                                    setError("");
                                    return;
                                  }
                                  if (!res.ok) {
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
            ) : null}
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Student letters</h2>
            <p>Approve a student or enrolment letter to grant 12 months of student status. A university email confirms itself with a code and does not appear here.</p>
            {studentUnavailable ? (
              <p>Student verification is not in this database yet. Apply supabase/migrations/20261023180000_student_verification.sql, then reload.</p>
            ) : null}
            {studentDocs.length === 0 && !studentUnavailable ? <p>No letters waiting.</p> : null}
            {studentDocs.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Letter", "Account", "Submitted", ""].map((header) => (
                        <th key={header} style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ padding: "6px 8px" }}>
                          {doc.url ? <a href={doc.url}>{doc.fileName}</a> : doc.fileName}
                        </td>
                        <td style={{ padding: "6px 8px" }}>{doc.userId}</td>
                        <td style={{ padding: "6px 8px" }}>{new Date(doc.createdAt).toLocaleString()}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              void (async () => {
                                const headers = await authHeader();
                                if (!headers) return;
                                const res = await fetch("/api/admin/students/review", {
                                  method: "POST",
                                  headers,
                                  body: JSON.stringify({ id: doc.id, decision: "approve" }),
                                });
                                const json = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                  setError(json.error || "Could not approve the letter.");
                                  return;
                                }
                                setNotice("Student letter approved.");
                                await load();
                              })();
                            }}
                          >
                            Approve
                          </button>{" "}
                          <button
                            type="button"
                            className="btn btn-quiet"
                            onClick={() => {
                              void (async () => {
                                const headers = await authHeader();
                                if (!headers) return;
                                const res = await fetch("/api/admin/students/review", {
                                  method: "POST",
                                  headers,
                                  body: JSON.stringify({ id: doc.id, decision: "reject" }),
                                });
                                const json = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                  setError(json.error || "Could not reject the letter.");
                                  return;
                                }
                                setNotice("Student letter rejected.");
                                await load();
                              })();
                            }}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <form
              className="promo-admin-form"
              style={{ marginTop: 12 }}
              onSubmit={(event) => {
                event.preventDefault();
                void (async () => {
                  const headers = await authHeader();
                  if (!headers) return;
                  const res = await fetch("/api/admin/students", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ domain }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (json.unavailable) {
                    setStudentUnavailable(true);
                    return;
                  }
                  if (!res.ok) {
                    setError(json.error || "Could not add the domain.");
                    return;
                  }
                  setDomain("");
                  setNotice("University domain added.");
                })();
              }}
            >
              <label>
                Extra university domain
                <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="ksu.edu.sa" />
              </label>
              <button className="btn" type="submit">Add domain</button>
            </form>
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
                  if (json.unavailable) {
                    setPendingMigration(true);
                    setError("");
                    return;
                  }
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
            {redemptions.length === 0 && !pendingMigration ? <p>No redemptions yet.</p> : null}
            {redemptions.length > 0 ? (
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
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
