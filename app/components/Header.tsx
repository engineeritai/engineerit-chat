"use client";

import Link from "next/link";

type HeaderProps = {
  onToggleSidebar: () => void;
};

export default function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        {/* mobile menu button */}
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>

        {/* engineerit logo (same style as before) */}
        <div className="brand" aria-label="engineerit">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </div>
      </div>
    </header>
  );
}