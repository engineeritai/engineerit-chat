"use client";

import BuyPlanButton from "@/app/components/BuyPlanButton";
import type { Messages } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";

type Props = {
  open: boolean;
  isGuest: boolean;
  m: Messages;
  notice?: string | null;
  planId?: PlanId;
  onClose: () => void;
};

export default function UpgradeDialog({ open, isGuest, m, notice, planId, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="gate-overlay" role="dialog" aria-modal="true">
      <div className="gate-modal">
        <div className="gate-title">
          {isGuest ? m.gating.registerRequired : m.gating.upgradeRequired}
        </div>
        <div className="gate-body">
          <div className="gate-text">
            {notice || (isGuest ? m.gating.lockedBody : m.gating.sendLocked)}
          </div>
          <div className="gate-actions">
            {planId ? (
              <BuyPlanButton
                planId={planId}
                interval="month"
                verb="upgrade"
                className="gate-btn gate-btn-primary"
              />
            ) : null}
            {isGuest ? (
              <a className="gate-btn" href="/login">
                {m.gating.loginCta}
              </a>
            ) : null}
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
