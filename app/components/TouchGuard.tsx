"use client";

import { useEffect } from "react";

/** Drop a second click on the same control inside 350ms (ghost taps on Android WebViews). */
export default function TouchGuard() {
  useEffect(() => {
    let last = 0;
    let lastTarget: EventTarget | null = null;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest("button, a, summary, label");
      if (!control) return;
      const now = performance.now();
      if (control === lastTarget && now - last < 350) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      last = now;
      lastTarget = control;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
