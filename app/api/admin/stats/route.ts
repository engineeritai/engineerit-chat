import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { countByPlan, countConfirmedSince, foldConfirmedSignups, foldSignups, riyadhStart, riyadhWindows, signupObservation, sumSar } from "@/lib/adminStats";
import { feedbackTableMissing, summarizePlatformFeedback } from "@/lib/platformFeedback";
import { aggregatePageViews, normalizePageViewRow, pageViewsTableMissing, type PageViewRow, type VisitReport } from "@/lib/visitAggregate";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

const USER_PAGE = 1000;
const USER_PAGE_CAP = 20;
const ROW_PAGE = 1000;
const ROW_CAP = 20000;
const VISIT_CAP = 20000;

async function signupRows(admin: ReturnType<typeof getSupabaseAdmin>) {
  const rows: NonNullable<ReturnType<typeof signupObservation>>[] = [];
  for (let page = 1; page <= USER_PAGE_CAP; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USER_PAGE });
    if (error) throw new Error(error.message);
    const users = data.users;
    for (const user of users) {
      const row = signupObservation(user);
      if (row) rows.push(row);
    }
    if (users.length < USER_PAGE) return rows;
  }
  throw new Error("Signup count stopped after 20,000 accounts and would be incomplete.");
}

async function countRows(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: "conversations",
  sinceIso: string
) {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) throw new Error(error.message);
  if (count == null) throw new Error(`No count returned for ${table}.`);
  return count;
}

async function activePlans(admin: ReturnType<typeof getSupabaseAdmin>) {
  const plans: string[] = [];
  for (let from = 0; from < ROW_CAP; from += ROW_PAGE) {
    const { data, error } = await admin
      .from("billing_subscriptions")
      .select("plan")
      .eq("status", "active")
      .range(from, from + ROW_PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = data || [];
    for (const row of batch) plans.push(typeof row.plan === "string" ? row.plan : "unknown");
    if (batch.length < ROW_PAGE) return plans;
  }
  throw new Error("Active subscription list was truncated.");
}

async function paidInvoices(admin: ReturnType<typeof getSupabaseAdmin>, sinceIso: string) {
  const rows: { amount_sar: number | string | null; plan: string | null }[] = [];
  for (let from = 0; from < ROW_CAP; from += ROW_PAGE) {
    const { data, error } = await admin
      .from("moyasar_invoices")
      .select("amount_sar, plan")
      .eq("status", "paid")
      .gte("paid_at", sinceIso)
      .range(from, from + ROW_PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < ROW_PAGE) return rows;
  }
  throw new Error("Paid invoice list was truncated.");
}

async function loadPageViews(admin: ReturnType<typeof getSupabaseAdmin>, sinceIso: string) {
  const rows: PageViewRow[] = [];
  try {
    for (let from = 0; from < VISIT_CAP; from += ROW_PAGE) {
      const { data, error } = await admin
        .from("page_views")
        .select("created_at, path, referrer_host, utm_source, utm_medium, utm_campaign, device_class, language, visitor_id")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .range(from, from + ROW_PAGE - 1);
      if (error) {
        if (pageViewsTableMissing(error)) return { rows, truncated: false, status: "missing" as const };
        return { rows, truncated: false, status: "unavailable" as const };
      }
      const batch = data || [];
      for (const row of batch) {
        const normalized = normalizePageViewRow(row);
        if (normalized) rows.push(normalized);
      }
      if (batch.length < ROW_PAGE) return { rows, truncated: false, status: "ready" as const };
    }
    return { rows, truncated: true, status: "ready" as const };
  } catch (err) {
    if (pageViewsTableMissing(err)) return { rows, truncated: false, status: "missing" as const };
    return { rows, truncated: false, status: "unavailable" as const };
  }
}

function visitReport(
  loaded: { rows: PageViewRow[]; truncated: boolean; status: "ready" | "missing" | "unavailable" },
  now: Date,
  confirmed7: number,
  confirmed30: number
): VisitReport {
  if (loaded.status === "missing") return { ready: false, reason: "missing" };
  if (loaded.status === "unavailable") return { ready: false, reason: "unavailable" };
  return aggregatePageViews(loaded.rows, now, { days7: confirmed7, days30: confirmed30 }, loaded.truncated);
}

async function platformFeedback(admin: ReturnType<typeof getSupabaseAdmin>) {
  const ratings: number[] = [];
  const latest: Array<{ rating: number | string | null; liked: string | null; improve: string | null; created_at: string }> = [];
  try {
  for (let from = 0; from < ROW_CAP; from += ROW_PAGE) {
    const { data, error } = await admin
      .from("platform_feedback")
      .select("rating, liked, improve, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + ROW_PAGE - 1);
    if (error) {
      if (feedbackTableMissing(error)) return null;
      throw error;
    }
    const batch = data || [];
    if (from === 0) latest.push(...batch);
    for (const row of batch) ratings.push(Number(row.rating));
    if (batch.length < ROW_PAGE) return summarizePlatformFeedback(ratings, latest);
  }
  throw new Error("Platform feedback list was truncated.");
  } catch (err) {
    if (feedbackTableMissing(err)) return null;
    throw err;
  }
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Owner only." }, { status: 403 });
  }

  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const { todayStart, weekStart } = riyadhWindows(now);
    const monthStart = riyadhStart(now, 29);
    const [rows, chatsToday, chats7, plans, payments, pageViews] = await Promise.all([
      signupRows(admin),
      countRows(admin, "conversations", todayStart.toISOString()),
      countRows(admin, "conversations", weekStart.toISOString()),
      activePlans(admin),
      paidInvoices(admin, weekStart.toISOString()),
      loadPageViews(admin, monthStart.toISOString()),
    ]);
    let feedback: Awaited<ReturnType<typeof platformFeedback>> = null;
    try {
      feedback = await platformFeedback(admin);
    } catch (err) {
      if (!feedbackTableMissing(err)) throw err;
    }
    const signups = foldSignups(rows.map((row) => row.createdAt), todayStart.getTime(), weekStart.getTime());
    const attribution = foldConfirmedSignups(rows, todayStart.getTime(), weekStart.getTime());
    const confirmed30 = countConfirmedSince(rows, monthStart.getTime());
    return NextResponse.json({
      timezone: "Asia/Riyadh",
      signups,
      attribution,
      visits: visitReport(pageViews, now, attribution.confirmed7, confirmed30),
      chats: { today: chatsToday, days7: chats7 },
      subscriptions: countByPlan(plans),
      payments7d: {
        count: payments.length,
        amountSar: sumSar(payments.map((row) => row.amount_sar)),
        byPlan: countByPlan(payments.map((row) => row.plan || "unknown")),
      },
      feedback,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load stats.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
