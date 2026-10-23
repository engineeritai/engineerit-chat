"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ShellCopy } from "@/lib/shell";

export type PromoQuote = {
  applied: boolean;
  code: string | null;
  listSar: number;
  discountSar: number;
  chargedSar: number;
  chargedHalalas: number;
  listHalalas: number;
  discountHalalas: number;
  cycles: number;
  free: boolean;
};

type Props = {
  checkoutId: string;
  payToken: string;
  preview?: boolean;
  copy: ShellCopy["checkout"];
  onPriced: (quote: PromoQuote) => void;
  onRedeemed: () => void;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function reasonText(reason: string, copy: ShellCopy["checkout"]) {
  if (reason === "expired") return copy.codeExpired;
  if (reason === "not_started" || reason === "inactive") return copy.codeNotYet;
  if (reason === "wrong_plan" || reason === "wrong_interval") return copy.codeWrongPlan;
  if (reason === "wrong_domain" || reason === "not_lapsed" || reason === "wrong_user") return copy.codeWrongAccount;
  if (reason === "already_used") return copy.codeUsed;
  if (reason === "max_uses") return copy.codeLimit;
  if (reason === "below_minimum") return copy.codeTooSmall;
  return copy.codeInvalid;
}

export default function CheckoutCode({ checkoutId, payToken, preview, copy, onPriced, onRedeemed }: Props) {
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"ok" | "bad" | "">("");
  const [quote, setQuote] = useState<PromoQuote | null>(null);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    void (async () => {
      const headers = await authHeader();
      const qs = new URLSearchParams({ id: checkoutId });
      if (payToken) qs.set("pay", payToken);
      const res = await fetch(`/api/checkout/promo?${qs}`, { headers });
      const json = await res.json().catch(() => null);
      if (cancelled || !res.ok || !json) return;
      setQuote(json);
      onPriced(json);
      if (json.applied) {
        setOpen(true);
        setCode(json.code || "");
        setTone("ok");
        setMessage(copy.codeApplied);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutId, payToken, preview, copy.codeApplied, onPriced]);

  async function submit(nextCode: string) {
    setBusy(true);
    setMessage(copy.codeChecking);
    setTone("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/checkout/promo", {
        method: "POST",
        headers,
        body: JSON.stringify({ id: checkoutId, code: nextCode, pay: payToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        setTone("bad");
        setMessage(reasonText(String(json.reason || ""), copy));
        return;
      }
      const priced = json as PromoQuote;
      setQuote(priced);
      onPriced(priced);
      setTone(priced.applied ? "ok" : "");
      setMessage(priced.applied ? copy.codeApplied : "");
      if (!priced.applied) setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    setBusy(true);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/checkout/promo/redeem", {
        method: "POST",
        headers,
        body: JSON.stringify({ id: checkoutId, pay: payToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        setTone("bad");
        setMessage(copy.codeInvalid);
        return;
      }
      onRedeemed();
    } finally {
      setBusy(false);
    }
  }

  const renewal =
    quote?.applied && quote.cycles > 1
      ? copy.afterDiscountCycles.replace("{count}", String(quote.cycles - 1))
      : quote?.applied
        ? copy.afterDiscountList
        : "";

  return (
    <div className="checkout-code">
      {open ? (
        <form
          className="checkout-code-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!preview) void submit(code);
          }}
        >
          <label className="checkout-code-field">
            <span className="sr-only">{copy.haveCode}</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={copy.codePlaceholder}
              autoComplete="off"
              autoCapitalize="characters"
              enterKeyHint="done"
              disabled={busy}
            />
          </label>
          <button type="submit" className="btn" disabled={busy || preview}>
            {copy.applyCode}
          </button>
          {quote?.applied ? (
            <button
              type="button"
              className="btn btn-quiet"
              disabled={busy}
              onClick={() => {
                if (!preview) void submit("");
              }}
            >
              {copy.removeCode}
            </button>
          ) : null}
        </form>
      ) : (
        <button type="button" className="checkout-code-toggle" onClick={() => setOpen(true)}>
          {copy.haveCode}
        </button>
      )}
      {message ? (
        <p className={`checkout-code-msg${tone ? ` is-${tone}` : ""}`} role="status">
          {message}
        </p>
      ) : null}
      {renewal ? <p className="checkout-code-note">{renewal}</p> : null}
      {quote?.free ? (
        <button type="button" className="btn checkout-code-redeem" disabled={busy} onClick={() => void redeem()}>
          {copy.freeRedeem}
        </button>
      ) : null}
    </div>
  );
}
