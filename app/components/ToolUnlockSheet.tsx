"use client";

import BuyPlanButton from "@/app/components/BuyPlanButton";
import { RiyalMark } from "@/app/components/RiyalAmount";
import { useMessages } from "@/lib/useMessages";
import { HEADER_PLAN_ABBREV, PLAN_AMOUNTS_SAR, type SelfServePlanId } from "@/lib/plans";

export default function ToolUnlockSheet({
  planId,
  onClose,
}: {
  planId: SelfServePlanId;
  onClose: () => void;
}) {
  const { shell: s } = useMessages();
  const amount = PLAN_AMOUNTS_SAR[planId].month;
  const name = HEADER_PLAN_ABBREV[planId];

  return (
    <div className="gate-overlay" role="presentation" onClick={onClose}>
      <div
        className="unlock-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="unlock-sheet-title" className="unlock-sheet-title">
          {s.chat.unlockWith} {name}
          {" — "}
          <span className="sar-amount" dir="ltr">
            <RiyalMark /> {amount}
            {s.chat.perMonth}
          </span>
        </p>
        <div className="unlock-sheet-actions">
          <BuyPlanButton
            planId={planId}
            interval="month"
            label={s.chat.upgrade}
            className="gate-btn gate-btn-primary"
          />
          <button type="button" className="gate-btn" onClick={onClose}>
            {s.chat.close}
          </button>
        </div>
      </div>
    </div>
  );
}
