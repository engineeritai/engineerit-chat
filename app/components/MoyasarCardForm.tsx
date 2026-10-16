"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type Props = {
  amountHalalas: number;
  description: string;
  callbackUrl: string;
  publishableKey: string;
  metadata: Record<string, string>;
};

export default function MoyasarCardForm({
  amountHalalas,
  description,
  callbackUrl,
  publishableKey,
  metadata,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !publishableKey) return;
    const moyasar = window.Moyasar;
    if (!moyasar) return;
    const node = document.querySelector(".mysr-form");
    if (node) node.innerHTML = "";
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
      credit_card: { save_card: true },
    });
  }, [ready, amountHalalas, description, callbackUrl, publishableKey, metadata]);

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
