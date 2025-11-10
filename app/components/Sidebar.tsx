// app/components/Sidebar.tsx
"use client";

type Props = {
  discipline: string;
  onDisciplineChange: (v: string) => void;
  onNewChat: () => void;
  threads: { id: string; title: string }[];
  currentThreadId?: string;
  onSelectThread: (id: string) => void;
};

const DISCIPLINES = [
  "General",
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Chemical Engineering",     // requested position (after Electrical)
  "Instrumentation",
  "Process Engineering",
  "Geotechnical",
  "Mining Engineering",
  "Architectural",
  "Project Engineering",
  "Value Engineering",
  "Survey",
  "Exploration",
  "HSE / HAZOP",
];

export default function Sidebar({
  discipline,
  onDisciplineChange,
  onNewChat,
  threads,
  currentThreadId,
  onSelectThread,
}: Props) {
  return (
    <aside className="sidebar">
      <button className="btn" onClick={onNewChat}>+ New chat</button>

      <div>
        <h3>Discipline</h3>
        <select
          className="select"
          value={discipline}
          onChange={(e) => onDisciplineChange(e.target.value)}
        >
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 10 }}>
        <h3>History</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {threads.length === 0 && (
            <div style={{ fontSize: 13, color: "#6b7280" }}>No conversations yet</div>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectThread(t.id)}
              style={{
                textAlign: "left",
                border: "1px solid #e5e7eb",
                background: currentThreadId === t.id ? "#fff" : "#f9fafb",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 14,
              }}
              title={t.title}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
