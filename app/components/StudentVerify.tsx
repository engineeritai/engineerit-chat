"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";

type Status = {
  unavailable?: boolean;
  verified?: boolean;
  verifiedUntil?: string | null;
  academicEmail?: string | null;
  pending?: boolean;
};

const FORM = {
  en: {
    email: "University email",
    send: "Send code",
    code: "6-digit code",
    confirm: "Confirm",
    letter: "Or upload a student or enrolment letter from a university or college (PDF or image, 5 MB).",
    upload: "Upload letter",
    pending: "Waiting for approval.",
    verified: "Verified until",
    sent: "Code sent. Check the university inbox.",
    taken: "This university email is already used on another account.",
    domain: "Use a university email ending in .edu.sa or .edu.",
    rate: "Wait a few minutes, then try again.",
    mismatch: "That code does not match.",
    expired: "That code has expired. Send a new one.",
    tooMany: "Too many attempts. Send a new code.",
    file: "Use a PDF or image under 5 MB.",
    waiting: "A letter is already waiting for review.",
    signIn: "Sign in to verify student status.",
    failed: "Could not verify student status.",
  },
  ar: {
    email: "البريد الجامعي",
    send: "إرسال الرمز",
    code: "رمز من 6 أرقام",
    confirm: "تأكيد",
    letter: "أو ارفع خطاب طالب أو قبول من جامعة أو كلية (PDF أو صورة، 5 ميجا).",
    upload: "رفع الخطاب",
    pending: "بانتظار الموافقة.",
    verified: "مؤكد حتى",
    sent: "أرسلنا الرمز. راجع البريد الجامعي.",
    taken: "هذا البريد الجامعي مستخدم لحساب آخر.",
    domain: "استخدم بريدا جامعيا ينتهي بـ edu.sa أو edu.",
    rate: "انتظر قليلا ثم حاول مرة أخرى.",
    mismatch: "الرمز غير مطابق.",
    expired: "انتهت صلاحية الرمز. أرسل رمزا جديدا.",
    tooMany: "محاولات كثيرة. أرسل رمزا جديدا.",
    file: "استخدم PDF أو صورة أقل من 5 ميجا.",
    waiting: "هناك خطاب بانتظار المراجعة.",
    signIn: "سجل الدخول لتأكيد صفة الطالب.",
    failed: "تعذر تأكيد صفة الطالب.",
  },
} as const;

function reasonText(reason: string, copy: (typeof FORM)[keyof typeof FORM]) {
  if (reason === "taken") return copy.taken;
  if (reason === "domain") return copy.domain;
  if (reason === "rate") return copy.rate;
  if (reason === "mismatch") return copy.mismatch;
  if (reason === "expired") return copy.expired;
  if (reason === "too_many") return copy.tooMany;
  if (reason === "type" || reason === "size") return copy.file;
  if (reason === "pending") return copy.waiting;
  if (reason === "auth") return copy.signIn;
  return copy.failed;
}

async function authHeader(json = true) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export default function StudentVerify({ preview = false, framed = false }: { preview?: boolean; framed?: boolean }) {
  const { locale, shell: s } = useMessages();
  const copy = FORM[locale];
  const [ready, setReady] = useState(false);
  const [skip, setSkip] = useState(preview);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"ok" | "bad" | "">("");

  useEffect(() => {
    const fixture = new URLSearchParams(window.location.search).get("fixture") === "preview";
    setSkip(preview || fixture);
    setReady(true);
  }, [preview]);

  useEffect(() => {
    if (!ready || skip) return;
    let cancelled = false;
    void (async () => {
      try {
        const headers = await authHeader();
        if (!headers) return;
        const res = await fetch("/api/student/status", { headers });
        const json = (await res.json().catch(() => null)) as Status | null;
        if (!cancelled && json && !json.unavailable) setStatus(json);
      } catch {
        // A failed status read leaves the form usable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, skip]);

  async function sendCode() {
    setBusy(true);
    setTone("");
    setMessage("");
    try {
      const headers = await authHeader();
      if (!headers) {
        setTone("bad");
        setMessage(copy.signIn);
        return;
      }
      const res = await fetch("/api/student/otp", {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.unavailable) return;
      if (!res.ok || json.ok === false) {
        setTone("bad");
        setMessage(reasonText(String(json.reason || ""), copy));
        return;
      }
      setTone("ok");
      setMessage(copy.sent);
    } catch {
      setTone("bad");
      setMessage(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setBusy(true);
    setTone("");
    try {
      const headers = await authHeader();
      if (!headers) {
        setTone("bad");
        setMessage(copy.signIn);
        return;
      }
      const res = await fetch("/api/student/otp/confirm", {
        method: "POST",
        headers,
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.unavailable) return;
      if (!res.ok || json.ok === false) {
        setTone("bad");
        setMessage(reasonText(String(json.reason || ""), copy));
        return;
      }
      setStatus({
        verified: true,
        verifiedUntil: json.verifiedUntil || null,
        academicEmail: email.trim().toLowerCase(),
        pending: false,
      });
      setTone("ok");
      setMessage("");
      setOpen(false);
    } catch {
      setTone("bad");
      setMessage(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function uploadLetter(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setTone("");
    try {
      const headers = await authHeader(false);
      if (!headers) {
        setTone("bad");
        setMessage(copy.signIn);
        return;
      }
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/student/document", { method: "POST", headers, body });
      const json = await res.json().catch(() => ({}));
      if (json.unavailable) return;
      if (!res.ok || json.ok === false) {
        setTone("bad");
        setMessage(reasonText(String(json.reason || ""), copy));
        return;
      }
      setStatus((current) => ({ ...current, pending: true, verified: current?.verified }));
      setTone("ok");
      setMessage(copy.pending);
    } catch {
      setTone("bad");
      setMessage(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  if (!ready || skip) return null;

  const until = status?.verifiedUntil ? new Date(status.verifiedUntil) : null;
  const untilLabel =
    until && !Number.isNaN(until.getTime())
      ? until.toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "";
  const expired = Boolean(status?.verifiedUntil) && status?.verified === false;

  return (
    <section className={framed ? "card student-verify" : "student-verify"} id="student" style={framed ? { marginTop: 24 } : undefined}>
      <p className="student-verify-offer">{s.checkout.studentOffer}</p>
      {status?.verified && untilLabel ? (
        <p className="student-verify-note">
          {copy.verified} {untilLabel}
          {status.academicEmail ? ` · ${status.academicEmail}` : ""}
        </p>
      ) : null}
      {expired ? <p className="student-verify-note">{s.checkout.studentExpired}</p> : null}
      {status?.pending ? <p className="student-verify-note">{copy.pending}</p> : null}
      <button type="button" className="checkout-code-toggle" onClick={() => setOpen((value) => !value)}>
        {s.checkout.verifyStudent}
      </button>
      {open ? (
        <div className="student-verify-form">
          <label>
            <span className="sr-only">{copy.email}</span>
            <input
              type="email"
              value={email}
              placeholder={copy.email}
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
          </label>
          <button type="button" className="btn" disabled={busy || !email.trim()} onClick={() => void sendCode()}>
            {copy.send}
          </button>
          <label>
            <span className="sr-only">{copy.code}</span>
            <input
              value={code}
              placeholder={copy.code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              disabled={busy}
            />
          </label>
          <button type="button" className="btn" disabled={busy || code.trim().length < 6} onClick={() => void confirmCode()}>
            {copy.confirm}
          </button>
          <p className="student-verify-note">{copy.letter}</p>
          <label className="student-verify-file">
            {copy.upload}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void uploadLetter(file);
              }}
            />
          </label>
        </div>
      ) : null}
      {message ? (
        <p className={`checkout-code-msg${tone ? ` is-${tone}` : ""}`} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
