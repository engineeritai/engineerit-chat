"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { isSaveCardRejection } from "@/lib/moyasarEnv";

type Props = {
  amountHalalas: number;
  description: string;
  callbackUrl: string;
  publishableKey: string;
  metadata: Record<string, string>;
  saveCard: boolean;
  onSaveCardRejected?: () => void;
};

export default function MoyasarCardForm({
  amountHalalas,
  description,
  callbackUrl,
  publishableKey,
  metadata,
  saveCard,
  onSaveCardRejected,
}: Props) {
  const [ready, setReady] = useState(false);
  const onRejected = useRef(onSaveCardRejected);
  onRejected.current = onSaveCardRejected;

  useEffect(() => {
    if (!ready || !publishableKey) return;
    const moyasar = window.Moyasar;
    if (!moyasar) return;
    const node = document.querySelector(".mysr-form");
    if (node) node.innerHTML = "";
    let reported = false;
    moyasar.init({
      element: ".mysr-form",
      amount: amountHalalas,
      currency: "SAR",
      description,
      publishable_api_key: publishableKey,
      callback_url: callbackUrl,
      supported_networks: ["mada", "visa", "mastercard", "amex"],
      methods: ["creditcard"],
      metadata,
      ...(saveCard ? { credit_card: { save_card: true } } : {}),
      on_failure: (error: unknown) => {
        if (!saveCard || reported || !isSaveCardRejection(error)) return;
        reported = true;
        onRejected.current?.();
      },
    });
  }, [ready, amountHalalas, description, callbackUrl, publishableKey, metadata, saveCard]);

  return (
    <>
      <link rel="stylesheet" href="https://cdn.moyasar.com/mpf/1.15.0/moyasar.css" />
      <Script
        src="https://cdn.moyasar.com/mpf/1.15.0/moyasar.js"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div className="mysr-form" />
    </>
  );
}

declare global {
  interface Window {
    Moyasar?: { init: (config: Record<string, unknown>) => void };
  }
}
