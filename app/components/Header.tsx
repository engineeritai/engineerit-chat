// app/components/Header.tsx

"use client";

export default function Header() {
  return (
    <header className="header" style={{ padding: "20px" }}>
      <div className="brand" aria-label="engineerit chat">
        <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "#0057ff" }}>
            engineer
          </span>
          <span
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: "transparent",
              WebkitTextStroke: "2px #0057ff",
            }}
          >
            it
          </span>
          <span style={{ fontSize: "36px", fontWeight: 700, marginLeft: "6px" }}>
            chat
          </span>
        </div>

        <p
          style={{
            marginTop: "4px",
            fontSize: "14px",
            color: "#666",
            fontWeight: 400,
          }}
        >
          AI Engineering Assistant
        </p>
      </div>
    </header>
  );
}
