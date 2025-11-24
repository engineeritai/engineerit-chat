"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";

type BotMessage = {
  id: string;
  from: "user" | "bot";
  text: string;
};

function uuid() {
  return Math.random().toString(36).slice(2);
}

export default function FeedbackPage() {
  const [type, setType] = useState("feedback");
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [botOpen, setBotOpen] = useState(false);
  const [botInput, setBotInput] = useState("");
  const [botSending, setBotSending] = useState(false);
  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    {
      id: uuid(),
      from: "bot",
      text: "Hi 👋 I am the Smart Assistant for engineerit.ai. How can I help you with the platform, subscriptions, or any issue?",
    },
  ]);

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
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { answer: string };
      const botMsg: BotMessage = {
        id: uuid(),
        from: "bot",
        text:
          data.answer ||
          "I could not understand well. Please try to explain in a different way.",
      };
      setBotMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Smart assistant error:", err);
      const botMsg: BotMessage = {
        id: uuid(),
        from: "bot",
        text:
          "There was an error connecting to the Smart Assistant. Please try again later.",
      };
      setBotMessages((prev) => [...prev, botMsg]);
    } finally {
      setBotSending(false);
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
          <h1 className="page-title">Feedback & Complaints</h1>
          <p className="page-subtitle">
            Help us improve engineerit.ai. Your feedback will be sent to{" "}
            <strong>info@engineerit.ai</strong>. You can also ask the{" "}
            <strong>Smart Assistant</strong> for instant help.
          </p>

          <form className="card" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                Category
                <select
                  className="select"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setStatus("idle");
                  }}
                >
                  <option value="feedback">Feedback</option>
                  <option value="complaint">Complaint</option>
                  <option value="suggestion">Suggestion</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Your email (optional)
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
                Message
                <textarea
                  className="textarea"
                  rows={5}
                  required
                  placeholder="Write your feedback, complaint, or suggestion in detail…"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setStatus("idle");
                  }}
                />
              </label>
            </div>

            <button className="btn" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Submit"}
            </button>

            {status === "done" && (
              <p style={{ fontSize: 13, color: "#16a34a", marginTop: 8 }}>
                Thank you. Your message has been submitted.
              </p>
            )}
            {status === "error" && (
              <p style={{ fontSize: 13, color: "#b91c1c", marginTop: 8 }}>
                There was a problem sending your message. Please try again
                later.
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
              <span>Smart Assistant</span>
            </button>
          </div>

          {botOpen && (
            <div className="helper-bot-panel">
              <div className="helper-bot-header">
                <div className="helper-bot-title">Smart Assistant</div>
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
                  aria-label="Close"
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
                  placeholder="Ask the Smart Assistant…"
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
                  {botSending ? "..." : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
