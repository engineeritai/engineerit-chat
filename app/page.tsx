"use client";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">Engineerit Chat</h1>
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-4 h-96 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`my-2 ${m.role === "user" ? "text-right" : "text-left"}`}>
            <span
              className={`inline-block p-2 rounded-lg ${
                m.role === "user" ? "bg-blue-100" : "bg-gray-200"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm">Thinking...</div>}
      </div>

      <div className="flex w-full max-w-2xl mt-4">
        <input
          className="flex-grow border border-gray-300 rounded-l-lg p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask an engineering question..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}