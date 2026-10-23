"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import { questionShareLinks } from "@/lib/promoCodes";
import { promoCopy } from "@/lib/promoCopy";
import { supabase } from "@/lib/supabaseClient";

type Choice = { id: string; label: string };
type Question = {
  id: string;
  question: string;
  choices: Choice[];
  endsAt: string;
  rewardPercent: number;
  participationOnly: boolean;
};

export default function QuestionView() {
  const { locale } = useLocale();
  const copy = promoCopy[locale].question;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSignedIn(Boolean(data.session));
      const headers: Record<string, string> = {};
      if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
      const res = await fetch(`/api/question?lang=${locale}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      setQuestion(json.question || null);
      if (json.attempt?.code) setCode(json.attempt.code);
      if (json.attempt) setMessage(json.attempt.code ? copy.already : copy.incorrect);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, copy.already, copy.incorrect]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!question || !choice) return;
    if (!signedIn) {
      window.location.href = `/login?next=${encodeURIComponent("/question")}`;
      return;
    }
    setBusy(true);
    const { data } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    const res = await fetch("/api/question", {
      method: "POST",
      headers,
      body: JSON.stringify({ questionId: question.id, choiceId: choice, locale }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent("/question")}`;
      return;
    }
    if (json.code) setCode(json.code);
    if (json.already) setMessage(copy.already);
    else if (json.rewarded && question.participationOnly) setMessage(copy.participation);
    else if (json.correct) setMessage(copy.correct);
    else setMessage(copy.incorrect);
  }

  const share = questionShareLinks("https://engineerit.ai/question", copy.title);

  return (
    <section className="mkt-section question-week">
      <h1>{copy.title}</h1>
      <p className="mkt-intro">{copy.lead}</p>
      {loaded && !question ? <p>{copy.empty}</p> : null}
      {question ? (
        <form onSubmit={(event) => void submit(event)}>
          <h2>{question.question}</h2>
          <div className="question-choices" role="radiogroup" aria-label={copy.choices}>
            {question.choices.map((item) => (
              <label key={item.id}>
                <input
                  type="radio"
                  name="week-choice"
                  value={item.id}
                  checked={choice === item.id}
                  onChange={() => setChoice(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="mkt-btn mkt-btn-primary" disabled={busy || !choice}>
            {busy ? copy.submitting : signedIn ? copy.submit : copy.signIn}
          </button>
          <p className="promo-note">{copy.reward(question.rewardPercent)}</p>
        </form>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {code ? (
        <p className="question-code">
          <bdi>{code}</bdi>{" "}
          <button
            type="button"
            className="mkt-btn mkt-btn-secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(code).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? copy.copied : copy.copy}
          </button>
        </p>
      ) : null}
      <div className="question-share">
        <span>{copy.share}</span>
        <a className="mkt-btn mkt-btn-secondary" href={share.linkedin} target="_blank" rel="noreferrer">
          {copy.linkedin}
        </a>
        <a className="mkt-btn mkt-btn-secondary" href={share.x} target="_blank" rel="noreferrer">
          {copy.x}
        </a>
      </div>
    </section>
  );
}
