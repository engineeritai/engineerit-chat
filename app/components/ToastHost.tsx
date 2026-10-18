"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; tone: "ok" | "err" };

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let next = 0;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; tone?: "ok" | "err" }>).detail;
      if (!detail?.message) return;
      const id = ++next;
      setToasts((current) => [...current.slice(-2), { id, message: detail.message || "", tone: detail.tone || "ok" }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 2800);
    };
    window.addEventListener("eit-toast", onToast);
    return () => window.removeEventListener("eit-toast", onToast);
  }, []);
  if (!toasts.length) return null;
  return (
    <div className="eit-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={"eit-toast" + (toast.tone === "err" ? " is-err" : "")}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
