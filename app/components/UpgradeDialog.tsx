"use client";

import type { Messages } from "@/lib/i18n";

type Props = {
  open: boolean;
  isGuest: boolean;
  m: Messages;
  notice?: string | null;
  onClose: () => void;
};

export default function UpgradeDialog({ open, isGuest, m, notice, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="gate-overlay" role="dialog" aria-modal="true">
      <div className="gate-modal">
        <div className="gate-title">
          {isGuest ? m.gating.registerRequired : m.gating.upgradeRequired}
        </div>
        {notice && <div className="gate-note">{notice}</div>}
        <div className="gate-body">
          <div className="gate-text">{isGuest ? m.gating.lockedBody : m.gating.sendLocked}</div>
          <div className="gate-actions">
            {isGuest ? (
              <>
                <a className="gate-btn" href="/login">
                  {m.gating.loginCta}
                </a>
                <a className="gate-btn gate-btn-primary" href="/register">
                  {m.gating.registerCta}
                </a>
              </>
            ) : (
              <a className="gate-btn gate-btn-primary" href="/subscription">
                {m.gating.upgradeCta}
              </a>
            )}
            <a className="gate-btn" href="/pricing">
              {m.gating.compareCta}
            </a>
            <button className="gate-btn" type="button" onClick={onClose}>
              {m.gating.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
