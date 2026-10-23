"use client";

import { useState } from "react";
import { SarText } from "@/app/components/RiyalAmount";
import { paymentSuccessPath } from "@/lib/checkoutReturn";
import { formatMoney } from "@/lib/labels";
import { promoCopy, renewalNote } from "@/lib/promoCopy";
import type { PromoRejectReason } from "@/lib/promoCodes";
import { supabase } from "@/lib/supabaseClient";

export type PromoQuoteState = {
  amount_sar: number;
  amount_halalas: number;
  list_amount_sar: number;
  list_amount_halalas: number;
  discount_sar: number;
  discount_halalas: number;
  promo_code: string | null;
  promo_cycles: number | null;
};

type Props = {
  checkoutId: string;
  preview: boolean;
  locale: "en" | "ar";
  dir: "ltr" | "rtl";
  payToken: string;
  listSar: number;
  discountSar: number;
  payableSar: number;
  payableHalalas: number;
  code: string;
  cycles: number;
  locked?: boolean;
  onPriced: (next: PromoQuoteState) => void;
};

export default function PromoCodeBox({
  checkoutId,
  preview,
  locale,
  dir,
  payToken,
  listSar,
  discountSar,
  payableSar,
  payableHalalas,
  code,
  cycles,
  locked = false,
  onPriced,
}: Props) {
  const copy = promoCopy[locale];
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const applied = Boolean(code);
  const free = payableHalalas === 0 && applied;

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function post(body: Record<string, unknown>) {
    const headers = await authHeader();
    const res = await fetch("/api/checkout/promo", {
      method: "POST",
      headers,
      body: JSON.stringify({ checkoutId, pay: payToken, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  }

  async function applyCode(event: React.FormEvent) {
    event.preventDefault();
    if (preview) {
      setOk(false);
      setMessage(copy.reasons.not_found);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { res, json } = await post({ action: "apply", code: value, amountHalalas: payableHalalas });
      if (!res.ok || !json.quote) {
        const reason = json.reason as PromoRejectReason;
        setOk(false);
        setMessage(copy.reasons[reason] || copy.reasons.not_found);
        return;
      }
      onPriced(json.quote);
      setValue("");
      setOk(true);
      setMessage(copy.applied);
    } catch {
      setOk(false);
      setMessage(copy.reasons.not_found);
    } finally {
      setBusy(false);
    }
  }

  async function removeCode() {
    if (preview) return;
    setBusy(true);
    try {
      const { res, json } = await post({ action: "remove" });
      if (res.ok && json.quote) {
        onPriced(json.quote);
        setOk(false);
        setMessage("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function activateFree() {
    if (preview) return;
    setBusy(true);
    setMessage("");
    try {
      const { res, json } = await post({ action: "activate" });
      if (!res.ok) {
        setOk(false);
        setMessage(copy.reasons.not_found);
        return;
      }
      window.location.assign(paymentSuccessPath(checkoutId, payToken));
    } catch {
      setOk(false);
      setMessage(copy.reasons.not_found);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="promo-box" dir={dir} data-testid="promo-code">
      {applied ? (
        <div className="promo-lines">
          <div>
            <span>{copy.original}</span>
            <SarText>{formatMoney(listSar, locale)}</SarText>
          </div>
          <div>
            <span>
              {copy.discount} <bdi dir="ltr">{code}</bdi>
            </span>
            <SarText>{formatMoney(discountSar, locale)}</SarText>
          </div>
          <div className="promo-total">
            <span>{copy.total}</span>
            <SarText>{formatMoney(payableSar, locale)}</SarText>
          </div>
        </div>
      ) : null}
      {applied ? <p className="promo-note">{free ? copy.freeNote : renewalNote(locale, cycles || 1)}</p> : null}
      {free ? (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void activateFree()}>
          {busy ? copy.activating : copy.freeActivate}
        </button>
      ) : locked ? null : (
        <form onSubmit={(event) => void applyCode(event)}>
          <label className="promo-label">
            <span>{copy.haveCode}</span>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              type="text"
              placeholder={copy.placeholder}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              dir="ltr"
              enterKeyHint="done"
              aria-label={copy.haveCode}
            />
          </label>
          <button type="submit" className="btn" disabled={busy || !value.trim()}>
            {busy ? copy.checking : copy.apply}
          </button>
          {applied ? (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void removeCode()}>
              {copy.remove}
            </button>
          ) : null}
        </form>
      )}
      {message ? (
        <p className={ok ? "promo-msg is-ok" : "promo-msg is-bad"} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
