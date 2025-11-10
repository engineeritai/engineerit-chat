// app/components/Header.tsx
"use client";

export default function Header() {
  return (
    <header className="header">
      <div className="brand" aria-label="engineerit chat">
        {/* single word: engineer + it, no gap */}
        <span className="word">
          <span className="engineer">engineer</span><span className="it">it</span>
        </span>
        <span className="chat">chat</span>
      </div>
    </header>
  );
}
