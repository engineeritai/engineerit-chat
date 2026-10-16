"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";
import { supabase } from "@/lib/supabaseClient";

export default function StartChatLink({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
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

  return (
    <Link className={className || "mkt-btn mkt-btn-primary mkt-cta-pulse"} href="/chat" onClick={onClick}>
      {signedIn ? content.nav.continueChat : content.nav.startChat}
    </Link>
  );
}
