"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="header">
      <div className="brand" aria-label="engineerit chat">
        <Image
          src="/engineerit logo.png"   // نفس الاسم اللي حطيته في public
          alt="engineerit logo"
          width={180}                  // غيّر القيمة حتى يضبط الحجم
          height={60}
          priority
        />
      </div>
    </header>
  );
}
