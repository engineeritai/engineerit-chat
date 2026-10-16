"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarketingShell from "../components/marketing/MarketingShell";
import { useMessages } from "@/lib/useMessages";

type BotMessage = {
  id: string;
  from: "user" | "bot";
  text: string;
};

function uuid() {
  return Math.random().toString(36).slice(2);
}

export default function FeedbackPage() {
  const { locale, shell: s } = useMessages();
  const [type, setType] = useState("feedback");
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  const [botOpen, setBotOpen] = useState(false);
  const [botInput, setBotInput] = useState("");
  const [botSending, setBotSending] = useState(false);
  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    { id: "hello", from: "bot", text: s.feedback.botHello },
  ]);

  useEffect(() => {
    setBotMessages([{ id: "hello", from: "bot", text: s.feedback.botHello }]);
  }, [locale, s.feedback.botHello]);

  // 🔧 إرسال النموذج للـ API بالشكل الصحيح
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: type,      // كان يُرسل type فقط
          message: text,       // كان يُرسل text فقط
          email: email || undefined,
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      setStatus("done");
      setText("");
    } catch (err) {
      console.error("Feedback submit error:", err);
      setStatus("error");
    }
  }

  async function sendBotMessage() {
    const question = botInput.trim();
    if (!question || botSending) return;
    setBotInput("");

    const userMsg: BotMessage = { id: uuid(), from: "user", text: question };
    setBotMessages((prev) => [...prev, userMsg]);
    setBotSending(true);
    try {
      const res = await fetch("/api/smart-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, locale }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { answer: string };
      const botMsg: BotMessage = {
        id: uuid(),
        from: "bot",
        text:
          data.answer || s.feedback.botUnclear,
      };
      setBotMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Smart assistant error:", err);
      const botMsg: BotMessage = {
        id: uuid(),
        from: "bot",
        text:
          s.feedback.botError,
      };
      setBotMessages((prev) => [...prev, botMsg]);
    } finally {
      setBotSending(false);
    }
  }

  return (
    <MarketingShell>
        <div className="page-wrap">
          <div className="advisor-breadcrumb">
            <Link href="/">{s.nav.home}</Link>
            <span aria-hidden="true">›</span>
            <span>{s.feedback.title}</span>
          </div>
          <div className="advisor-title-row">
            <h1 className="page-title">{s.feedback.title}</h1>
          </div>
          <p className="page-subtitle">{s.feedback.lead}</p>

          <form className="card" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                {s.feedback.category}
                <select
                  className="select"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setStatus("idle");
                  }}
                >
                  <option value="feedback">{s.feedback.feedback}</option>
                  <option value="complaint">{s.feedback.complaint}</option>
                  <option value="suggestion">{s.feedback.suggestion}</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                {s.feedback.emailOptional}
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setStatus("idle");
                  }}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                {s.feedback.message}
                <textarea
                  className="textarea"
                  rows={5}
                  required
                  placeholder={s.feedback.messagePlaceholder}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setStatus("idle");
                  }}
                />
              </label>
            </div>

            <button className="btn" disabled={status === "sending"}>
              {status === "sending" ? s.feedback.sending : s.feedback.submit}
            </button>

            {status === "done" && (
              <p style={{ fontSize: 13, color: "#16a34a", marginTop: 8 }}>
                {s.feedback.thanks}
              </p>
            )}
            {status === "error" && (
              <p style={{ fontSize: 13, color: "#b91c1c", marginTop: 8 }}>
                {s.feedback.sendError}
              </p>
            )}
          </form>

          {/* Smart Assistant floating widget */}
          <div className="helper-bot-badge">
            <button
              type="button"
              className="helper-bot-button"
              onClick={() => setBotOpen((v) => !v)}
            >
              🤖
              <span>{s.feedback.assistant}</span>
            </button>
          </div>

          {botOpen && (
            <div className="helper-bot-panel">
              <div className="helper-bot-header">
                <div className="helper-bot-title">{s.feedback.assistant}</div>
                <button
                  type="button"
                  onClick={() => setBotOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 18,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                  aria-label={s.feedback.close}
                >
                  ×
                </button>
              </div>
              <div className="helper-bot-body">
                {botMessages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf:
                        m.from === "user" ? "flex-end" : "flex-start",
                      maxWidth: "90%",
                      padding: "6px 9px",
                      borderRadius: 12,
                      background:
                        m.from === "user" ? "#e5f0ff" : "#f3f4f6",
                    }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="helper-bot-composer">
                <input
                  className="helper-bot-input"
                  placeholder={s.feedback.askPlaceholder}
                  value={botInput}
                  onChange={(e) => setBotInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendBotMessage();
                    }
                  }}
                />
                <button
                  className="helper-bot-send"
                  type="button"
                  disabled={botSending}
                  onClick={sendBotMessage}
                >
                  {botSending ? "..." : s.feedback.send}
                </button>
              </div>
            </div>
          )}
        </div>
    </MarketingShell>
  );
}
