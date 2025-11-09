"use client";

import { useState } from "react";

export default function Home() {
  const [discipline, setDiscipline] = useState("General");
  const [question, setQuestion] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-white text-gray-900">
      {/* Heading: "engineer" filled + "it" outlined */}
      <h1 className="text-6xl font-extrabold tracking-tight mb-6 text-center leading-tight">
        <span className="engineer-fill logo-halo">engineer</span>
        <span className="it-outline logo-halo">it</span>
        <span className="ml-3 text-gray-800">chat</span>
      </h1>

      {/* UI */}
      <div className="mb-3 flex items-center gap-3">
        <label htmlFor="discipline" className="font-medium">Discipline</label>
        <select
          id="discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option>General</option>
          <option>Civil</option>
          <option>Mechanical</option>
          <option>Electrical</option>
          <option>Process</option>
          <option>Instrumentation</option>
        </select>
      </div>

      <textarea
        className="w-full max-w-4xl h-44 p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
        placeholder="Ask an engineering question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
    </main>
  );
}
