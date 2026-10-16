import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang !== "en" && lang !== "ar") return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-engineerit-locale", lang);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set("engineerit_locale", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
