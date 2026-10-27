"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Action = { label: string; onSelect: () => void };

/**
 * Share actions as a bottom sheet on a phone and a menu on a wide screen.
 * The sheet is portaled so it is not a flex child of the message toolbar.
 */
export default function MessageShareMenu({
  open,
  dir,
  label,
  actions,
  onClose,
}: {
  open: boolean;
  dir: "ltr" | "rtl";
  label: string;
  actions: Action[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="msg-share-backdrop" role="presentation" onClick={onClose}>
      <div
        className="msg-share-sheet"
        role="menu"
        dir={dir}
        lang={dir === "rtl" ? "ar" : "en"}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            className="msg-share-item"
            onClick={() => {
              action.onSelect();
              onClose();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
