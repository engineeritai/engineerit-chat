"use client";

import { useEffect, useRef } from "react";

let chain: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void> | void) {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Push a history entry so the Android/iOS back gesture closes an overlay. */
export function useHistoryOverlay(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    let active = true;
    let popped = false;
    let token = "";
    let removePop = () => {};
    const ready = enqueue(() => {
      if (!active) return;
      token = `eit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const previous = history.state && typeof history.state === "object" ? history.state : {};
      history.pushState({ ...previous, eitOverlay: token }, "");
      const onPop = () => {
        popped = true;
        closeRef.current();
      };
      window.addEventListener("popstate", onPop);
      removePop = () => window.removeEventListener("popstate", onPop);
    });
    return () => {
      active = false;
      enqueue(async () => {
        await ready;
        removePop();
        if (!popped && token && history.state?.eitOverlay === token) {
          await new Promise<void>((resolve) => {
            const done = () => {
              window.removeEventListener("popstate", done);
              resolve();
            };
            window.addEventListener("popstate", done);
            history.back();
          });
        }
      });
    };
  }, [open]);
}
