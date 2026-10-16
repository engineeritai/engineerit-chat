"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";

export default function PhonePayQr({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    void toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" })
      .then((data) => {
        if (!cancelled) setSrc(data);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!src) return null;
  return <img src={src} alt={alt} width={240} height={240} />;
}
