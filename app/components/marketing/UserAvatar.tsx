"use client";

import { useState } from "react";

const COLORS = ["#1a56ff", "#0f766e", "#b45309", "#7c3aed", "#be123c", "#0369a1"];

function colorFor(name: string) {
  let hash = 0;
  for (const char of name || "?") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

export default function UserAvatar({
  url,
  name,
  size = 32,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const label = initials(name);

  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="user-avatar"
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className="user-avatar user-avatar-fallback"
      style={{ width: size, height: size, background: colorFor(name) }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
