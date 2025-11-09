"use client";
import { useState } from "react";

const DISCIPLINES = [
  { id: "general", label: "General" },
  { id: "process", label: "Process" },
  { id: "piping", label: "Piping / P&ID" },
  { id: "mechanical", label: "Mechanical" },
  { id: "civil", label: "Civil / Structural" },
  { id: "electrical", label: "Electrical" },
  { id: "instrument", label: "Instrumentation" },
  { id: "hazop", label: "HAZOP / Safety" },
];

export default function Page() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [discipline, setDiscipline] = useState("general");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMsg,
        discipline,
      }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "No reply." }]);
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">engineerit chat</h1>

      <div className="mb-2 flex gap-2 items-center">
        <label className="text-sm text-gray-600">Discipline</label>
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {DISCIPLINES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>

      <div className="border rounded p-4 bg-white min-h-[320px] mb-3 overflow-y-auto">
        {messages.length === 0 && <div className="text-gray-400">Ask an engineering question…</div>}
        {messages.map((m, i) => (
          <div key={i} className={`my-2 ${m.role === "user" ? "text-blue-700" : "text-gray-900"}`}>
            <b>{m.role === "user" ? "You:" : "engineerit:"}</b> {m.content}
          </div>
        ))}
        {loading && <div className="text-gray-400">Thinking…</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Ask an engineering question…"
        />
        <button onClick={send} className="bg-blue-600 text-white rounded px-4">Send</button>
      </div>
    </main>
  );
}