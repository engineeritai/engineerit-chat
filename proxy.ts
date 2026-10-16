import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/.well-known" || pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const target = new URL(request.url);
    target.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(target.toString(), 308);
  }

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
  matcher: [
    "/.well-known/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
