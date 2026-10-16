"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { BrandPhrase } from "@/app/components/marketing/BrandArabic";
import { getMarketingContent } from "@/lib/marketing";
import { supabase } from "@/lib/supabaseClient";

export default function StartChatLink({
  className,
  onClick,
  label,
}: {
  className?: string;
  onClick?: () => void;
  label?: string;
}) {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancel = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancel) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      cancel = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const shown = signedIn ? content.nav.continueChat : label || content.nav.startChat;

  return (
    <Link className={className || "mkt-btn mkt-btn-primary mkt-cta-pulse"} href="/chat" onClick={onClick}>
      {shown.includes("هندسها") ? <BrandPhrase text={shown} /> : shown}
    </Link>
  );
}
