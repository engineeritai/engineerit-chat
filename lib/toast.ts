export type ToastTone = "ok" | "err";

export function showToast(message: string, tone: ToastTone = "ok") {
  if (typeof window === "undefined" || !message) return;
  window.dispatchEvent(new CustomEvent("eit-toast", { detail: { message, tone } }));
}
