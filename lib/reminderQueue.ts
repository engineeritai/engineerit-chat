import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnqueueInput, EnqueueSubscription, NewReminder, ReminderRow } from "@/lib/reminderMail";
import { isReminderKind, normalizeReminderRow } from "@/lib/reminderMail";
import type { ReminderStore } from "@/lib/reminderRun";

const TABLE = "email_notifications";
const OPT_OUT = "email_notification_opt_outs";

function localeOf(value: unknown): "en" | "ar" | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  if (token === "ar" || token.startsWith("ar-")) return "ar";
  if (token === "en" || token.startsWith("en-")) return "en";
  return null;
}

export function rowFromRecord(record: Record<string, unknown>): ReminderRow | null {
  const normalized = normalizeReminderRow(record);
  if (!normalized || normalized.status !== "pending" || !isReminderKind(normalized.kind)) return null;
  return {
    id: normalized.id,
    userId: normalized.userId,
    email: normalized.email,
    kind: normalized.kind,
    createdAt: normalized.createdAt || "",
    sentAt: normalized.sentAt,
    claimedAt: normalized.claimedAt,
    locale: normalized.locale,
  };
}

async function eachPage(
  load: (from: number) => Promise<{ rows: Record<string, unknown>[]; error: { message: string } | null }>
) {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < 20; page += 1) {
    const from = page * 1000;
    const { rows: batch, error } = await load(from);
    if (error) throw new Error(error.message);
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
  return rows;
}

export async function loadReminderQueue(admin: SupabaseClient, now: Date) {
  const pending = await eachPage(async (from) => {
    const { data, error } = await admin.from(TABLE).select("*").eq("status", "pending").range(from, from + 999);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const sent = await eachPage(async (from) => {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from(TABLE)
      .select("user_id, sent_at, status")
      .eq("status", "sent")
      .gte("sent_at", since)
      .range(from, from + 999);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const opted = await eachPage(async (from) => {
    const { data, error } = await admin.from(OPT_OUT).select("user_id").range(from, from + 999);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  let lifecycleOptOut: Record<string, unknown>[] = [];
  const lifecycle = await admin.from("lifecycle_email_opt_outs").select("user_id").limit(1000);
  if (!lifecycle.error) lifecycleOptOut = (lifecycle.data || []) as Record<string, unknown>[];
  else if (!/does not exist|schema cache|could not find/i.test(lifecycle.error.message)) {
    throw new Error(lifecycle.error.message);
  }

  const rows = pending.map(rowFromRecord).filter((row): row is ReminderRow => Boolean(row));
  const recentlySent = new Set(sent.map((row) => String(row.user_id || "")).filter(Boolean));
  const optedOut = new Set(
    [...opted, ...lifecycleOptOut].map((row) => String(row.user_id || "")).filter(Boolean)
  );
  const keyed = await eachPage(async (from) => {
    const { data, error } = await admin.from(TABLE).select("dedupe_key").not("dedupe_key", "is", null).range(from, from + 999);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const existingKeys = new Set(keyed.map((row) => (typeof row.dedupe_key === "string" ? row.dedupe_key : "")).filter(Boolean));
  return { rows, recentlySent, optedOut, existingKeys };
}

export async function loadReminderAudience(admin: SupabaseClient): Promise<{
  profiles: EnqueueInput[];
  subscriptions: EnqueueSubscription[];
}> {
  const profiles = await eachPage(async (from) => {
    const { data, error } = await admin.from("profiles").select("id, email, subscription_tier").range(from, from + 999);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  const subscriptions = await eachPage(async (from) => {
    const { data, error } = await admin
      .from("billing_subscriptions")
      .select("user_id, customer_email, status, current_period_end, locale")
      .range(from, from + 999);
    return { rows: (data || []) as Record<string, unknown>[], error };
  });
  return {
    profiles: profiles.map((row) => ({
      id: String(row.id || ""),
      email: typeof row.email === "string" ? row.email : null,
      tier: typeof row.subscription_tier === "string" ? row.subscription_tier : null,
    })),
    subscriptions: subscriptions
      .map((row) => ({
        userId: String(row.user_id || ""),
        email: typeof row.customer_email === "string" ? row.customer_email : null,
        status: String(row.status || ""),
        periodEnd: String(row.current_period_end || ""),
        locale: localeOf(row.locale),
      }))
      .filter((row) => row.userId && row.periodEnd),
  };
}

export function supabaseReminderStore(admin: SupabaseClient): ReminderStore {
  return {
    async expire(id, now) {
      const { error } = await admin
        .from(TABLE)
        .update({ status: "expired", skip_reason: "stale", sent_at: null, claimed_at: now.toISOString() })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw new Error(error.message);
    },
    async skip(id, reason, now) {
      const { error } = await admin
        .from(TABLE)
        .update({ status: "skipped", skip_reason: reason, claimed_at: now.toISOString() })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw new Error(error.message);
    },
    async claim(id, now) {
      const { data, error } = await admin
        .from(TABLE)
        .update({ claimed_at: now.toISOString() })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
      if (error) throw new Error(error.message);
      return Boolean(data && data.length);
    },
    async markSent(id, now) {
      const { error } = await admin
        .from(TABLE)
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    async release(id) {
      const { error } = await admin.from(TABLE).update({ claimed_at: null }).eq("id", id).eq("status", "pending");
      if (error) throw new Error(error.message);
    },
    async insert(row: NewReminder, now) {
      const { data, error } = await admin
        .from(TABLE)
        .insert({
          user_id: row.userId,
          email: row.email,
          kind: row.kind,
          type: row.kind,
          locale: row.locale,
          status: "pending",
          dedupe_key: row.dedupeKey,
          created_at: now.toISOString(),
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (/duplicate|unique/i.test(error.message)) return null;
        throw new Error(error.message);
      }
      return data ? rowFromRecord(data as Record<string, unknown>) : null;
    },
  };
}

export async function recordReminderOptOut(admin: SupabaseClient, userId: string, now = new Date()) {
  const { error } = await admin.from(OPT_OUT).upsert(
    { user_id: userId, opted_out_at: now.toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
  await admin.from(TABLE).update({ status: "skipped", skip_reason: "unsubscribed" }).eq("user_id", userId).eq("status", "pending");
}
