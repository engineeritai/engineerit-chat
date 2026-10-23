"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import { supabase } from "@/lib/supabaseClient";

type Question = {
  id: string;
  questionEn: string;
  questionAr: string;
  choicesEn: string[];
  choicesAr: string[];
  rewardPercent: number;
  participationOnly: boolean;
  validDays: number;
};

const COPY = {
  en: {
    title: "Question of the week",
    lead: "Take part and get a discount code for a paid plan. List prices stay the same. The code applies at checkout.",
    empty: "No question is open this week.",
    loadFailed: "Could not load this week's question.",
    signIn: "Sign in to answer",
    submit: "Submit answer",
    sending: "Sending",
    correct: "Correct.",
    thanks: "Thanks for taking part.",
    missed: "Not this time. A new question is posted each week.",
    code: "Your code",
    expires: "Valid until",
    copy: "Copy code",
    copied: "Copied",
    share: "Share",
    shareX: "Share on X",
    shareLinkedIn: "Share on LinkedIn",
    ruleCorrect: "A correct answer earns {percent}% off, valid for {days} days.",
    ruleAny: "Any answer earns {percent}% off, valid for {days} days.",
  },
  ar: {
    title: "سؤال الأسبوع",
    lead: "شارك واحصل على رمز خصم لباقة مدفوعة. الأسعار المعلنة تبقى كما هي. الرمز يطبق عند الدفع.",
    empty: "لا يوجد سؤال مفتوح هذا الأسبوع.",
    loadFailed: "تعذر تحميل سؤال هذا الأسبوع.",
    signIn: "سجل الدخول للإجابة",
    submit: "إرسال الإجابة",
    sending: "جار الإرسال",
    correct: "إجابة صحيحة.",
    thanks: "شكرا لمشاركتك.",
    missed: "ليست هذه المرة. ينشر سؤال جديد كل أسبوع.",
    code: "رمزك",
    expires: "صالح حتى",
    copy: "نسخ الرمز",
    copied: "تم النسخ",
    share: "مشاركة",
    shareX: "مشاركة على X",
    shareLinkedIn: "مشاركة على LinkedIn",
    ruleCorrect: "الإجابة الصحيحة تمنح خصما {percent}% صالحا {days} يوما.",
    ruleAny: "أي إجابة تمنح خصما {percent}% صالحا {days} يوما.",
  },
} as const;

export default function QuestionView() {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const [question, setQuestion] = useState<Question | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ rewarded: boolean; correct: boolean; code: string | null; expiresAt: string | null; percent?: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("https://engineerit.ai/question");

  useEffect(() => {
    setPageUrl(window.location.href);
    void supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => setSignedIn(false));
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/question");
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(copy.loadFailed);
          setReady(true);
          return;
        }
        setQuestion(json.question || null);
        setReady(true);
      } catch {
        if (cancelled) return;
        setError(copy.loadFailed);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed]);

  const text = question ? (locale === "ar" ? question.questionAr : question.questionEn) : "";
  const choices = question ? (locale === "ar" ? question.choicesAr : question.choicesEn) : [];
  const rule = question
    ? (question.participationOnly ? copy.ruleAny : copy.ruleCorrect)
        .replace("{percent}", String(question.rewardPercent))
        .replace("{days}", String(question.validDays))
    : "";
  const shareText = `${copy.title} — ${text}`.slice(0, 220);
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;

  async function submit() {
    if (!question || choice === null) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = "/login?next=/question";
        return;
      }
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, choiceIndex: choice }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.reason === "unavailable" || json.unavailable) {
        setQuestion(null);
        setResult(null);
        return;
      }
      if (!res.ok) {
        setError(json.error || copy.loadFailed);
        return;
      }
      setResult({
        rewarded: Boolean(json.rewarded),
        correct: Boolean(json.correct),
        code: json.code || null,
        expiresAt: json.expiresAt || null,
        percent: json.percent,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mkt-section question-week">
      <h1>{copy.title}</h1>
      <p className="mkt-intro">{copy.lead}</p>
      {error ? <p className="question-week-bad">{error}</p> : null}
      {ready && !question && !error ? <p>{copy.empty}</p> : null}
      {question ? (
        <div className="question-week-card">
          <p className="question-week-rule">{rule}</p>
          <h2>{text}</h2>
          <fieldset className="question-week-choices">
            <legend className="sr-only">{copy.title}</legend>
            {choices.map((item, index) => (
              <label key={`${index}-${item}`}>
                <input
                  type="radio"
                  name="week-choice"
                  checked={choice === index}
                  onChange={() => setChoice(index)}
                />
                <span>{item}</span>
              </label>
            ))}
          </fieldset>
          {signedIn ? (
            <button type="button" className="btn" disabled={busy || choice === null} onClick={() => void submit()}>
              {busy ? copy.sending : copy.submit}
            </button>
          ) : (
            <a className="btn" href="/login?next=/question">
              {copy.signIn}
            </a>
          )}
          {result ? (
            <div className="question-week-result" role="status">
              <p>{result.rewarded ? (result.correct ? copy.correct : copy.thanks) : copy.missed}</p>
              {result.code ? (
                <>
                  <p>
                    {copy.code}: <strong className="question-week-code">{result.code}</strong>
                  </p>
                  {result.expiresAt ? (
                    <p>
                      {copy.expires} {new Date(result.expiresAt).toLocaleDateString(locale === "ar" ? "ar" : "en-GB")}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => {
                      void navigator.clipboard?.writeText(result.code || "").then(() => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                  >
                    {copied ? copy.copied : copy.copy}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="question-week-share">
        {copy.share}:{" "}
        <a href={xHref} target="_blank" rel="noopener noreferrer">
          {copy.shareX}
        </a>
        {" · "}
        <a href={linkedInHref} target="_blank" rel="noopener noreferrer">
          {copy.shareLinkedIn}
        </a>
      </p>
    </section>
  );
}
