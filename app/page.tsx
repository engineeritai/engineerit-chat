"use client";

import { useState } from "react";

export default function Home() {
  const [discipline, setDiscipline] = useState("General");
  const [question, setQuestion] = useState("");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full max-w-6xl px-6">
      {/* ====== LOGO TITLE ====== */}
      <h1 className="text-center mb-10 leading-none font-sans">
        <span className="engineer-blue text-7xl md:text-8xl">engineer</span>
        <span className="it-outline text-7xl md:text-8xl">it</span>
        <span className="text-6xl md:text-7xl ml-3 text-black font-medium">
          chat
        </span>
      </h1>

      {/* ====== DISCIPLINE SELECTOR ====== */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-lg">
        <label htmlFor="discipline" className="font-medium text-gray-900">
          Discipline
        </label>
        <select
          id="discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="border rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option>General</option>
          <option>Civil Engineering</option>
          <option>Structural Engineering</option>
          <option>Geotechnical Engineering</option>
          <option>Mechanical Engineering</option>
          <option>Electrical Engineering</option>
          <option>Instrumentation Engineering</option>
          <option>Mining Engineering</option>
          <option>Chemical Engineering</option>
          <option>Petroleum Engineering</option>
          <option>Process Engineering</option>
          <option>Architectural Engineering</option>
          <option>Project Engineering</option>
          <option>Value Engineering</option>
          <option>Environmental Engineering</option>
          <option>Industrial Engineering</option>
          <option>Materials Engineering</option>
          <option>Water Resources Engineering</option>
          <option>Transportation Engineering</option>
          <option>Energy Engineering</option>
        </select>
      </div>

      {/* ====== CHAT BOX ====== */}
      <textarea
        className="w-full h-80 p-6 border rounded-xl shadow-md focus:ring-2 focus:ring-blue-400 outline-none text-gray-800 text-lg resize-none"
        placeholder={`Ask a ${discipline.toLowerCase()} question...`}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      {/* ====== SUBMIT BUTTON ====== */}
      <button
        onClick={() => alert(`Question submitted for ${discipline}`)}
        className="mt-6 px-6 py-3 bg-[#276EF1] text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
      >
        Submit
      </button>
    </main>
  );
}
