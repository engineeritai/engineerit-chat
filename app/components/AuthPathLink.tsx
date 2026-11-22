"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import { authPath } from "@/lib/registerLink";

type Props = {
  path?: "/register" | "/login";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** After auth, return to the page the visitor is on, including its query. */
  returnHere?: boolean;
};

/** /register or /login with the active language and any utm_source, utm_medium, utm_campaign. */
export default function AuthPathLink({
  path = "/register",
  className,
  style,
  children,
  returnHere = false,
}: Props) {
  const { locale } = useLocale();
  const lang = locale === "ar" ? "ar" : "en";
  const [href, setHref] = useState(`${path}?lang=${lang}`);

  useEffect(() => {
    const next = returnHere ? window.location.pathname + window.location.search : undefined;
    setHref(authPath(path, { locale: lang, search: window.location.search, next }));
  }, [lang, path, returnHere]);

  return (
    <a className={className} style={style} href={href}>
      {children}
    </a>
  );
}
