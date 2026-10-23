"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { PROMO_PLANS } from "@/lib/promoCodes";
import { supabase } from "@/lib/supabaseClient";

type CodeRow = {
  id: string;
  code: string;
  kind: string;
  percent_off: number | null;
  amount_off_sar: number | null;
  free_months: number | null;
  plans: string[];
  intervals: string[];
  cycle_count: number;
  status: string;
  audience: string;
  email_domains: string[];
  max_uses: number | null;
  expires_at: string | null;
  batch_id: string | null;
  note: string | null;
};

type Redemption = {
  id: string;
  email: string | null;
  status: string;
  created_at: string;
  invoice_id: string;
  promo_code_id: string;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function AdminPromosPage() {
  const [sidebar, setSidebar] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);
  const [plans, setPlans] = useState<string[]>(["engineer"]);
  const [kind, setKind] = useState("percent");
  const [audience, setAudience] = useState("any");

  async function load() {
    const headers = await authHeader();
    if (!headers) {
      setError("Sign in with the owner account.");
      return;
    }
    const res = await fetch("/api/admin/promos", { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not load codes.");
      return;
    }
    setCodes(json.codes || []);
    setRedemptions(json.redemptions || []);
    setError("");
  }

  useEffect(() => {
    void load();
  }, []);

  async function send(body: Record<string, unknown>) {
    const headers = await authHeader();
    if (!headers) return { ok: false, error: "Sign in with the owner account." };
    const res = await fetch("/api/admin/promos", { method: "POST", headers, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error || "Could not save." };
    return { ok: true, json };
  }

  function togglePlan(plan: string) {
    setPlans((current) => (current.includes(plan) ? current.filter((item) => item !== plan) : [...current, plan]));
  }

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap promo-admin">
          <h1 className="page-title">Promo codes</h1>
          <p className="page-subtitle">
            List prices stay the same. A code changes only the Moyasar charge. Create the first student
            gift under Student batch, or a single code under New code. Question of the week is public at
            /question.
          </p>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
          {notice ? <p style={{ color: "#166534" }}>{notice}</p> : null}

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>New code</h2>
            <form
              className="promo-admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void send({
                  action: "create",
                  code: form.get("code"),
                  kind,
                  percentOff: form.get("percentOff"),
                  amountOffSar: form.get("amountOffSar"),
                  freeMonths: form.get("freeMonths"),
                  cycleCount: form.get("cycleCount"),
                  plans,
                  intervals: form.getAll("intervals"),
                  startsAt: form.get("startsAt"),
                  expiresAt: form.get("expiresAt"),
                  maxUses: form.get("maxUses"),
                  onePerUser: form.get("onePerUser") === "on",
                  audience,
                  emailDomains: form.get("emailDomains"),
                  note: form.get("note"),
                }).then((result) => {
                  if (!result.ok) setError(result.error || "");
                  else {
                    setNotice(`Created ${result.json.code}.`);
                    void load();
                  }
                });
              }}
            >
              <label>Code<input name="code" placeholder="STUDENT10" dir="ltr" /></label>
              <label>
                Kind
                <select value={kind} onChange={(event) => setKind(event.target.value)}>
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed SAR off</option>
                  <option value="free_months">Free months</option>
                </select>
              </label>
              {kind === "percent" ? <label>Percent<input name="percentOff" type="number" min="1" max="100" defaultValue="10" /></label> : null}
              {kind === "fixed" ? <label>SAR off<input name="amountOffSar" type="number" min="1" step="0.01" /></label> : null}
              {kind === "free_months" ? <label>Free months<input name="freeMonths" type="number" min="1" max="24" defaultValue="1" /></label> : null}
              {kind !== "free_months" ? <label>Cycles<input name="cycleCount" type="number" min="1" max="36" defaultValue="1" /></label> : null}
              <fieldset>
                <legend>Plans</legend>
                {PROMO_PLANS.map((plan) => (
                  <label key={plan}>
                    <input type="checkbox" checked={plans.includes(plan)} onChange={() => togglePlan(plan)} /> {plan}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Billing</legend>
                <label><input type="checkbox" name="intervals" value="month" defaultChecked /> month</label>
                <label><input type="checkbox" name="intervals" value="year" defaultChecked={kind !== "free_months"} /> year</label>
              </fieldset>
              <label>
                Audience
                <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                  <option value="any">Anyone</option>
                  <option value="email_domain">Email domain</option>
                  <option value="lapsed">Earlier subscribers, lapsed</option>
                </select>
              </label>
              {audience === "email_domain" ? (
                <label>Domains<input name="emailDomains" placeholder=".edu.sa, ksu.edu.sa" dir="ltr" /></label>
              ) : null}
              <label>Starts<input name="startsAt" type="datetime-local" /></label>
              <label>Expires<input name="expiresAt" type="datetime-local" /></label>
              <label>Max uses<input name="maxUses" type="number" min="1" placeholder="unlimited" /></label>
              <label><input type="checkbox" name="onePerUser" defaultChecked /> One use per account</label>
              <label>Note<input name="note" /></label>
              <button className="btn btn-primary" type="submit">Create code</button>
            </form>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Student batch</h2>
            <p>Each code works once. Leave domains empty for unrestricted single-use codes, or set .edu.sa.</p>
            <form
              className="promo-admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void send({
                  action: "batch",
                  count: form.get("count"),
                  prefix: form.get("prefix"),
                  kind: form.get("batchKind"),
                  freeMonths: form.get("freeMonths"),
                  percentOff: form.get("percentOff"),
                  plans: ["engineer"],
                  intervals: ["month"],
                  emailDomains: form.get("emailDomains"),
                  expiresAt: form.get("expiresAt"),
                  note: "Student gift",
                }).then((result) => {
                  if (!result.ok) setError(result.error || "");
                  else {
                    setBatchCodes(result.json.codes || []);
                    setNotice(`Generated ${result.json.count} codes.`);
                    void load();
                  }
                });
              }}
            >
              <label>Count<input name="count" type="number" min="1" max="500" defaultValue="25" /></label>
              <label>Prefix<input name="prefix" defaultValue="STUDENT" dir="ltr" /></label>
              <label>
                Kind
                <select name="batchKind" defaultValue="free_months">
                  <option value="free_months">Free months</option>
                  <option value="percent">Percent off</option>
                </select>
              </label>
              <label>Free months<input name="freeMonths" type="number" min="1" defaultValue="1" /></label>
              <label>Percent<input name="percentOff" type="number" min="1" max="100" defaultValue="10" /></label>
              <label>Domains<input name="emailDomains" placeholder=".edu.sa" dir="ltr" /></label>
              <label>Expires<input name="expiresAt" type="datetime-local" /></label>
              <button className="btn btn-primary" type="submit">Generate batch</button>
            </form>
            {batchCodes.length > 0 ? (
              <textarea readOnly dir="ltr" value={batchCodes.join("\n")} rows={8} />
            ) : null}
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Question of the week</h2>
            <form
              className="promo-admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const choices = [1, 2, 3, 4].map((index) => ({
                  en: String(form.get(`en${index}`) || ""),
                  ar: String(form.get(`ar${index}`) || ""),
                }));
                void send({
                  action: "question",
                  questionEn: form.get("questionEn"),
                  questionAr: form.get("questionAr"),
                  choices,
                  correctIndex: Number(form.get("correctIndex") || 1) - 1,
                  rewardPercent: form.get("rewardPercent"),
                  participationOnly: form.get("participationOnly") === "on",
                  validDays: form.get("validDays"),
                  startsAt: form.get("startsAt"),
                  endsAt: form.get("endsAt"),
                  plans: PROMO_PLANS,
                  intervals: ["month", "year"],
                }).then((result) => {
                  if (!result.ok) setError(result.error || "");
                  else {
                    setNotice("Question saved. It is live between the start and end.");
                    void load();
                  }
                });
              }}
            >
              <label>Question (EN)<input name="questionEn" required /></label>
              <label>Question (AR)<input name="questionAr" required /></label>
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="promo-admin-pair">
                  <label>Choice {index} EN<input name={`en${index}`} /></label>
                  <label>Choice {index} AR<input name={`ar${index}`} /></label>
                </div>
              ))}
              <label>Correct choice (1-4)<input name="correctIndex" type="number" min="1" max="4" defaultValue="1" /></label>
              <label>Reward %<input name="rewardPercent" type="number" min="1" max="100" defaultValue="10" /></label>
              <label><input type="checkbox" name="participationOnly" /> Reward anyone who takes part</label>
              <label>Code valid days<input name="validDays" type="number" min="1" max="90" defaultValue="14" /></label>
              <label>Starts<input name="startsAt" type="datetime-local" required /></label>
              <label>Ends<input name="endsAt" type="datetime-local" required /></label>
              <button className="btn btn-primary" type="submit">Publish question</button>
            </form>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Codes</h2>
            <div className="promo-admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Offer</th>
                    <th>Plans</th>
                    <th>Audience</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((row) => (
                    <tr key={row.id}>
                      <td dir="ltr">{row.code}</td>
                      <td>{offerLabel(row)}</td>
                      <td>{(row.plans || []).join(", ")}</td>
                      <td>{row.audience}{(row.email_domains || []).length ? ` (${row.email_domains.join(", ")})` : ""}</td>
                      <td>{row.status}</td>
                      <td>
                        {row.status === "active" ? (
                          <button
                            type="button"
                            className="btn btn-quiet"
                            onClick={() => {
                              void send({ action: "disable", id: row.id }).then((result) => {
                                if (!result.ok) setError(result.error || "");
                                else void load();
                              });
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
          </section>

          <section className="card">
            <h2 className="section-heading" style={{ marginTop: 0 }}>Redemptions</h2>
            <div className="promo-admin-table">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.created_at).toLocaleString("en-GB")}</td>
                      <td>{row.email || row.promo_code_id}</td>
                      <td>{row.status}</td>
                      <td dir="ltr">{row.invoice_id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function offerLabel(row: CodeRow) {
  if (row.kind === "percent") return `${row.percent_off}% × ${row.cycle_count}`;
  if (row.kind === "fixed") return `${row.amount_off_sar} SAR × ${row.cycle_count}`;
  return `${row.free_months} free month(s)`;
}
