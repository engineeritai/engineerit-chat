import type { SupabaseClient } from "@supabase/supabase-js";
import { teamGrantsAccess } from "@/lib/effectivePlan";
import { isTestRecipient } from "@/lib/mailPolicy";
import type { LifecycleCandidate, LifecycleLocale } from "@/lib/lifecycleMail";

const PAGE = 1000;
const PAGE_CAP = 20;

export type LifecycleUserInput = {
  id: string;
  email: string | null;
  createdAt: string;
  bannedUntil?: string | null;
  metadata?: unknown;
};

const PAID_TIERS = new Set(["engineer", "professional", "consultant"]);
const PAID_PLANS = new Set(["engineer", "professional", "consultant", "team", "enterprise"]);

export function paidAccess(args: { tier: string | null; billingPaid: boolean; teamPaid: boolean }) {
  if (args.billingPaid || args.teamPaid) return true;
  return PAID_TIERS.has((args.tier || "").trim());
}

export function localeFromUser(billing: unknown, metadata: unknown): LifecycleLocale {
  const record = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  return knownLocale(billing, record.locale, record.lang, record.language);
}

function knownLocale(...values: unknown[]): LifecycleLocale {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const token = value.trim().toLowerCase();
    if (token === "ar" || token.startsWith("ar-")) return "ar";
    if (token === "en" || token.startsWith("en-")) return "en";
  }
  return null;
}

export function usableLifecycleEmail(email: string | null | undefined) {
  const value = (email || "").trim().toLowerCase();
  if (!value.includes("@") || /\s/.test(value) || value.length > 320) return null;
  return value;
}

export function isBannedAccount(until: string | null | undefined, now: Date) {
  if (!until) return false;
  const ms = Date.parse(until);
  return Number.isFinite(ms) && ms > now.getTime();
}

export function buildLifecycleCandidates(args: {
  users: LifecycleUserInput[];
  now: Date;
  optedOut: ReadonlySet<string>;
  lastSentAt: ReadonlyMap<string, string>;
  tiers: ReadonlyMap<string, string | null>;
  billingLocale: ReadonlyMap<string, string | null>;
  billingPaid: ReadonlySet<string>;
  teamPaid: ReadonlySet<string>;
}): LifecycleCandidate[] {
  const candidates: LifecycleCandidate[] = [];
  for (const user of args.users) {
    const email = usableLifecycleEmail(user.email);
    if (!email || isTestRecipient(email) || isBannedAccount(user.bannedUntil, args.now)) continue;
    const tier = args.tiers.get(user.id) ?? null;
    candidates.push({
      id: user.id,
      email,
      createdAt: user.createdAt,
      locale: localeFromUser(args.billingLocale.get(user.id), user.metadata),
      paid: paidAccess({
        tier,
        billingPaid: args.billingPaid.has(user.id),
        teamPaid: args.teamPaid.has(user.id),
      }),
      optedOut: args.optedOut.has(user.id),
      lastSentAt: args.lastSentAt.get(user.id) ?? null,
    });
  }
  return candidates;
}

type Admin = SupabaseClient;

async function eachPage(
  load: (from: number) => Promise<{ rows: Record<string, unknown>[]; error: { message: string } | null }>
) {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < PAGE_CAP; page += 1) {
    const from = page * PAGE;
    const { rows: batch, error } = await load(from);
    if (error) throw new Error(error.message);
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
  throw new Error("Lifecycle audience stopped after 20,000 rows and would be incomplete.");
}

export async function loadLifecycleCandidates(admin: Admin, now: Date) {
  const users: LifecycleUserInput[] = [];
  for (let page = 1; page <= PAGE_CAP; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(error.message);
    for (const user of data.users) {
      const ban = user as { banned_until?: string | null };
      users.push({
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at,
        bannedUntil: ban.banned_until ?? null,
        metadata: user.user_metadata,
      });
    }
    if (data.users.length < PAGE) break;
    if (page === PAGE_CAP) throw new Error("Lifecycle audience stopped after 20,000 accounts and would be incomplete.");
  }

  const optRows = await eachPage(async (from) => {
    const { data, error } = await admin
      .from("lifecycle_email_opt_outs")
      .select("user_id")
      .range(from, from + PAGE - 1);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const sentRows = await eachPage(async (from) => {
    const { data, error } = await admin
      .from("lifecycle_email_queue")
      .select("user_id, sent_at")
      .eq("status", "sent")
      .range(from, from + PAGE - 1);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const profiles = await eachPage(async (from) => {
    const { data, error } = await admin.from("profiles").select("id, subscription_tier").range(from, from + PAGE - 1);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const billing = await eachPage(async (from) => {
    const { data, error } = await admin
      .from("billing_subscriptions")
      .select("user_id, plan, status, locale")
      .in("status", ["active", "past_due"])
      .range(from, from + PAGE - 1);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const members = await eachPage(async (from) => {
    const { data, error } = await admin
      .from("team_members")
      .select("user_id, team_id")
      .eq("status", "active")
      .range(from, from + PAGE - 1);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });

  const teamIds = [...new Set(members.map((row) => String(row.team_id || "")).filter(Boolean))];
  const teams: Record<string, unknown>[] = [];
  for (let index = 0; index < teamIds.length; index += 100) {
    const slice = teamIds.slice(index, index + 100);
    const { data, error } = await admin.from("teams").select("id, plan, status, current_period_end").in("id", slice);
    if (error) throw new Error(error.message);
    teams.push(...((data || []) as Record<string, unknown>[]));
  }

  const activeTeams = new Set(
    teams
      .filter((team) =>
        teamGrantsAccess(
          {
            plan: typeof team.plan === "string" ? team.plan : null,
            status: typeof team.status === "string" ? team.status : null,
            current_period_end: typeof team.current_period_end === "string" ? team.current_period_end : null,
          },
          now
        )
      )
      .map((team) => String(team.id))
  );

  const optedOut = new Set(optRows.map((row) => String(row.user_id)));
  const lastSentAt = new Map<string, string>();
  for (const row of sentRows) {
    const id = String(row.user_id || "");
    const sentAt = typeof row.sent_at === "string" ? row.sent_at : "";
    if (!id || !sentAt) continue;
    const previous = lastSentAt.get(id);
    if (!previous || Date.parse(sentAt) > Date.parse(previous)) lastSentAt.set(id, sentAt);
  }
  const tiers = new Map<string, string | null>();
  for (const row of profiles) {
    tiers.set(String(row.id), typeof row.subscription_tier === "string" ? row.subscription_tier : null);
  }
  const billingPaid = new Set<string>();
  const billingLocale = new Map<string, string | null>();
  for (const row of billing) {
    const id = String(row.user_id || "");
    if (!id) continue;
    if (typeof row.plan === "string" && PAID_PLANS.has(row.plan)) billingPaid.add(id);
    if (!billingLocale.has(id) && typeof row.locale === "string") billingLocale.set(id, row.locale);
  }
  const teamPaid = new Set<string>();
  for (const row of members) {
    if (activeTeams.has(String(row.team_id || ""))) teamPaid.add(String(row.user_id || ""));
  }

  return buildLifecycleCandidates({
    users,
    now,
    optedOut,
    lastSentAt,
    tiers,
    billingLocale,
    billingPaid,
    teamPaid,
  });
}
