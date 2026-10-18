"use client";

import { useEffect, useState } from "react";
import { formatMessageTime, MESSAGE_TIME_ZONE, resolveMessageTimeZone } from "@/lib/messageTime";
import type { UiLocale } from "@/lib/ksaTime";

export function useMessageTimeZone() {
  const [zone, setZone] = useState(MESSAGE_TIME_ZONE);
  useEffect(() => {
    setZone(resolveMessageTimeZone());
  }, []);
  return zone;
}

export function MessageTime({
  iso,
  locale,
  zone,
}: {
  iso?: string;
  locale: UiLocale;
  zone: string;
}) {
  const label = formatMessageTime(iso, locale, new Date(), zone);
  if (!label || !iso) return null;
  return (
    <time className="message-time" dateTime={iso}>
      {label}
    </time>
  );
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="day-separator" role="separator">
      <span>{label}</span>
    </div>
  );
}
