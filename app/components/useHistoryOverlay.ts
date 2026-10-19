"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

let chain: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void> | void) {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function here() {
  return location.pathname + location.search;
}

/**
 * Push a history entry so the Android/iOS back gesture closes an overlay.
 * Programmatic close calls history.back() only while the URL is unchanged.
 * A drawer link navigates with its own pushState; backing out of that entry
 * cancels the navigation and the tap looks dead.
 */
export function useHistoryOverlay(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    let active = true;
    let popped = false;
    let token = "";
    let openedUrl = "";
    let removePop = () => {};
    const ready = enqueue(() => {
      if (!active) return;
      token = `eit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      openedUrl = here();
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
        if (popped || !token || history.state?.eitOverlay !== token) return;
        if (here() !== openedUrl) {
          const { eitOverlay: _drop, ...rest } = history.state as Record<string, unknown>;
          history.replaceState(rest, "");
          return;
        }
        await new Promise<void>((resolve) => {
          const done = () => {
            window.removeEventListener("popstate", done);
            resolve();
          };
          window.addEventListener("popstate", done);
          history.back();
        });
      });
    };
  }, [open]);
}

/** Close a drawer after the route changes. Do not close it inside the link click. */
export function useCloseOnRouteChange(close: () => void) {
  const pathname = usePathname() || "/";
  const closeRef = useRef(close);
  closeRef.current = close;
  const pathRef = useRef(pathname);
  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    closeRef.current();
  }, [pathname]);
}
