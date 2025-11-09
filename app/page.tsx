"use client";

import { useState } from "react";

export default function Home() {
  const [discipline, setDiscipline] = useState("General");
  const [question, setQuestion] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white text-gray-900">
      <h1 className="text-5xl font-extrabold tracking-tight mb-6 text-center">
        <span className="neon logo-halo">engineerit</span>
        <span className="ml-2 text-gray-700">chat</span>
      </h1>

      <div className="mb-4">
        <label htmlFor="discipline" className="mr-2 font-medium">
          Discipline
        </label>
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
          <option>Chemical</option>
        </select>
      </div>

      <textarea
        className="w-full max-w-2xl h-40 p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
        placeholder="Ask an engineering question…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      ></textarea>
    </main>
  );
}
