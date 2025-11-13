"use client";

export default function Header() {
  return (
    <header className="header">
      <div className="brand" aria-label="engineerit chat">

        {/* الكلمة الرئيسية engineerit */}
        <span className="logo">
          <span className="engineer">engineer</span>
          <span className="it">it</span>
        </span>

        {/* الكلمة الثانوية chat */}
        <span className="chat">chat</span>
      </div>
    </header>
  );
}
