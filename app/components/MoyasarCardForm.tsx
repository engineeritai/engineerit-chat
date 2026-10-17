"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  APPLE_PAY_SDK_URL,
  MOYASAR_CARD_NETWORKS,
  SAMSUNG_PAY_SDK_URL,
  checkoutPaymentMethods,
  isSaveCardRejection,
  moyasarSaveOptions,
} from "@/lib/moyasarEnv";

type Props = {
  amountHalalas: number;
  description: string;
  callbackUrl: string;
  publishableKey: string;
  metadata: Record<string, string>;
  saveCard: boolean;
  locale?: "en" | "ar";
  wallets?: boolean;
  samsungPayServiceId?: string;
  orderNumber?: string;
  attempt?: number;
  failureFallback?: string;
  onSaveCardRejected?: () => void;
  onPaymentError?: (message: string) => void;
};

function errorText(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

export default function MoyasarCardForm({
  amountHalalas,
  description,
  callbackUrl,
  publishableKey,
  metadata,
  saveCard,
  locale = "en",
  wallets = false,
  samsungPayServiceId = "",
  orderNumber = "",
  attempt = 0,
  failureFallback = "",
  onSaveCardRejected,
  onPaymentError,
}: Props) {
  const [appleReady, setAppleReady] = useState(false);
  const [samsungReady, setSamsungReady] = useState(false);
  const [moyasarReady, setMoyasarReady] = useState(false);
  const serviceId = samsungPayServiceId.trim();
  const ready = moyasarReady && (!wallets || appleReady) && (!wallets || !serviceId || samsungReady);
  const onRejected = useRef(onSaveCardRejected);
  const onFailed = useRef(onPaymentError);
  onRejected.current = onSaveCardRejected;
  onFailed.current = onPaymentError;

  useEffect(() => {
    if (!ready || !publishableKey) return;
    const moyasar = window.Moyasar;
    if (!moyasar) return;
    const node = document.querySelector(".mysr-form");
    if (node) node.innerHTML = "";
    const methods = checkoutPaymentMethods(serviceId, wallets);
    let reported = false;
    try {
      moyasar.init({
        element: ".mysr-form",
        amount: amountHalalas,
        currency: "SAR",
        description,
        publishable_api_key: publishableKey,
        callback_url: callbackUrl,
        supported_networks: [...MOYASAR_CARD_NETWORKS],
        methods,
        metadata,
        language: locale,
        fixed_width: false,
        ...moyasarSaveOptions({
          saveCard,
          wallets,
          samsungServiceId: serviceId,
          orderNumber,
          checkoutId: metadata.checkout_id,
        }),
        on_failure: (error: unknown) => {
          if (saveCard && !reported && isSaveCardRejection(error)) {
            reported = true;
            onRejected.current?.();
            return;
          }
          onFailed.current?.(errorText(error) || failureFallback);
        },
      });
    } catch (error) {
      onFailed.current?.(errorText(error) || failureFallback);
    }
    const noticeTimer = window.setTimeout(() => {
      const notice = document.querySelector(".mysr-form-configNotice")?.textContent?.trim();
      if (notice) onFailed.current?.(notice);
    }, 0);
    return () => window.clearTimeout(noticeTimer);
  }, [
    ready,
    amountHalalas,
    description,
    callbackUrl,
    publishableKey,
    metadata,
    saveCard,
    locale,
    wallets,
    samsungPayServiceId,
    orderNumber,
    attempt,
    failureFallback,
  ]);

  return (
    <>
      <link rel="stylesheet" href="https://cdn.moyasar.com/mpf/1.15.0/moyasar.css" />
      {wallets ? (
        <Script
          src={APPLE_PAY_SDK_URL}
          strategy="afterInteractive"
          onLoad={() => setAppleReady(true)}
          onError={() => setAppleReady(true)}
        />
      ) : null}
      {wallets && serviceId ? (
        <Script
          src={SAMSUNG_PAY_SDK_URL}
          strategy="afterInteractive"
          onLoad={() => setSamsungReady(true)}
          onError={() => setSamsungReady(true)}
        />
      ) : null}
      <Script
        src="https://cdn.moyasar.com/mpf/1.15.0/moyasar.js"
        strategy="afterInteractive"
        onLoad={() => setMoyasarReady(true)}
        onError={() => onFailed.current?.(failureFallback)}
      />
      <div className="mysr-form" data-wallet-methods={wallets ? "applepay samsungpay stcpay" : "card"} key={attempt} />
    </>
  );
}

declare global {
  interface Window {
    Moyasar?: { init: (config: Record<string, unknown>) => void };
  }
}
