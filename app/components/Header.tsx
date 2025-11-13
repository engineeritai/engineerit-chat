"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="header">
      <div className="brand" aria-label="engineerit chat">
        {/* شعار engineerit */}
        <Image
          src="/engineerit-logo.PNG"  // نفس الاسم الموجود في مجلد public
          alt="engineerit logo"
          width={260}
          height={70}
          priority
        />

        {/* كلمة chat على يمين الشعار كما كانت */}
        <span className="chat">chat</span>
      </div>
    </header>
  );
}
