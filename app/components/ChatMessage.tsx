// app/components/ChatMessage.tsx
"use client";

type Role = "user" | "assistant";

export default function ChatMessage({
  role,
  content,
}: {
  role: Role;
  content: string;
}) {
  return <div className={`msg ${role}`}>{content}</div>;
}
