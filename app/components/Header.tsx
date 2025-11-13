"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="header">
      <div className="brand" aria-label="engineerit chat">
        {/* شعار engineerit */}
        <Image
          src="/engineerit-logo.png"  // نفس الاسم الموجود في مجلد public
          alt="engineerit logo"
          width={160}
          height={50}
          priority
        />

        {/* كلمة chat على يمين الشعار كما كانت */}
        <span className="chat">chat</span>
      </div>
    </header>
  );
}
