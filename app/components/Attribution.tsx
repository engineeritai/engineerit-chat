"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Keep LinkedIn (and other) campaign tags for this browser tab. No cookie is set. */
export default function Attribution() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
