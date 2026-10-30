"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ShareMenuIcon = "view" | "copy" | "share" | "html" | "print" | "whatsapp" | "close";

const GLYPH: Record<ShareMenuIcon, string> = {
  view: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  copy: "M8 8h11v11H8zM5 16V5h11",
  share: "M12 16V4m0 0 4 4m-4-4-4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7",
  html: "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4",
  print: "M6 9V3h12v6M6 18H4v-5h16v5h-2M6 14h12v7H6z",
  whatsapp: "M20 11.5A8.5 8.5 0 0 1 7.6 18L4 19.5 5.6 16A8.5 8.5 0 1 1 20 11.5z",
  close: "M6 6l12 12M18 6 6 18",
};

export function ShareGlyph({ name }: { name: ShareMenuIcon }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d={GLYPH[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Action = { label: string; icon: ShareMenuIcon; onSelect: () => void };

/**
 * Share actions as a bottom sheet on a phone and a menu on a wide screen.
 * The sheet is portaled so it is not a flex child of the message toolbar.
 * Opening it does not call the system share sheet.
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

  if (!open) return null;

  const sheet = (
    <div className="msg-share-backdrop" role="presentation" onClick={onClose}>
      <div
        className="msg-share-sheet"
        role="menu"
        dir={dir}
        lang={dir === "rtl" ? "ar" : "en"}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="msg-share-handle" aria-hidden="true" />
        {actions.map((action) => (
          <button
            key={action.icon}
            type="button"
            role="menuitem"
            className="msg-share-item"
            onClick={() => {
              action.onSelect();
              onClose();
            }}
          >
            <ShareGlyph name={action.icon} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
