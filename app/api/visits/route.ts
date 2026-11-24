import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { pageViewsTableMissing } from "@/lib/visitAggregate";
import { planPageView, resolveVisitSalt, visitDay } from "@/lib/visitTracking";
import { clientIp } from "@/lib/visitPublic";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = () => new NextResponse(null, { status: 204 });

let announcedMissing = false;

function header(req: Request, name: string) {
  return req.headers.get(name) || "";
}

function field(body: unknown, key: string) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.slice(0, 300) : "";
}

function hostOf(req: Request) {
  const forwarded = header(req, "x-forwarded-host").split(",")[0]?.trim() || "";
  return forwarded || header(req, "host");
}

/**
 * Page-view beacon. Always answers 204. A failure, a bot, or a missing table
 * must not affect the page that sent it.
 */
export async function POST(req: Request) {
  try {
    const length = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(length) && length > 4000) return EMPTY();
    const text = await req.text();
    if (text.length > 4000) return EMPTY();
    let body: unknown = {};
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        return EMPTY();
      }
    }

    let isAdmin = false;
    if (header(req, "authorization").toLowerCase().startsWith("bearer ")) {
      const user = await getUserFromRequest(req);
      isAdmin = Boolean(user && isAdminEmail(user.email));
    }

    const now = new Date();
    const xPurpose = header(req, "x-purpose").toLowerCase();
    const plan = planPageView({
      method: req.method,
      host: hostOf(req),
      path: field(body, "path"),
      userAgent: header(req, "user-agent"),
      ip: clientIp({
        vercel: header(req, "x-vercel-forwarded-for"),
        real: header(req, "x-real-ip"),
        forwarded: header(req, "x-forwarded-for"),
      }),
      referrer: field(body, "referrer"),
      utmSource: field(body, "utm_source"),
      utmMedium: field(body, "utm_medium"),
      utmCampaign: field(body, "utm_campaign"),
      language: field(body, "language"),
      purpose: header(req, "purpose") || (xPurpose === "preview" ? "prefetch" : ""),
      secPurpose: header(req, "sec-purpose"),
      nextPrefetch: header(req, "next-router-prefetch"),
      nextSegmentPrefetch: header(req, "next-router-segment-prefetch"),
      middlewarePrefetch: header(req, "x-middleware-prefetch"),
      testHeader: header(req, "x-engineerit-test"),
      secFetchSite: header(req, "sec-fetch-site"),
      isAdmin,
      day: visitDay(now),
      salt: resolveVisitSalt().salt,
    });
    if (!plan.record) return EMPTY();

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("page_views").insert(plan.row);
    if (error) {
      if (pageViewsTableMissing(error)) {
        if (!announcedMissing) {
          announcedMissing = true;
          console.error("[visits] page_views table is not created yet");
        }
      } else {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
        console.error("[visits] insert failed", code || "unknown");
      }
    }
  } catch {
    /* The beacon must never surface an error to the page. */
  }
  return EMPTY();
}

export function GET() {
  return EMPTY();
}
