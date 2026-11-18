"use client";

import { useEffect } from "react";
import { captureAttribution, trackCampaignVisit } from "@/lib/attribution";

/** Keep a whitelisted source for 30 days in local storage. No cookie is set. */
export default function Attribution() {
  useEffect(() => {
    const captured = captureAttribution();
    if (captured.emitVisit) trackCampaignVisit(captured.acquisition);
  }, []);
  return null;
}
