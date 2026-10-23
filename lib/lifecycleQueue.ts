import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifecycleClaimInput, LifecycleClaimResult, LifecycleMailer } from "@/lib/lifecycleRun";
import { LIFECYCLE_FROM_ADDRESS, LIFECYCLE_FROM_NAME } from "@/lib/lifecycleMail";

type QueueRow = {
  id: string;
  subject: string;
  body_text: string;
  body_html: string;
  email: string;
};

function messageFrom(row: QueueRow) {
  return {
    to: row.email,
    subject: row.subject,
    text: row.body_text,
    html: row.body_html,
    fromName: LIFECYCLE_FROM_NAME,
    fromAddress: LIFECYCLE_FROM_ADDRESS,
    replyTo: LIFECYCLE_FROM_ADDRESS,
  };
}

/**
 * Service-role queue. enqueue_lifecycle_feedback_emails is not granted to
 * anon or authenticated. enqueue_subscription_emails is also service-role
 * only; this path does not call it, because that function is a different
 * mail stream and its body is not in the repo.
 */
export function supabaseLifecycleMailer(admin: SupabaseClient): LifecycleMailer {
  return {
    async claim(input: LifecycleClaimInput): Promise<LifecycleClaimResult> {
      const { data, error } = await admin.rpc("enqueue_lifecycle_feedback_emails", {
        p_user_id: input.userId,
        p_email: input.email,
        p_cycle_key: input.cycleKey,
        p_kind: input.kind,
        p_locale: input.locale,
        p_subject: input.subject,
        p_text: input.text,
        p_html: input.html,
      });
      if (error) throw new Error(error.message);
      if (!data) return { action: "skip" };
      const { data: row, error: readError } = await admin
        .from("lifecycle_email_queue")
        .select("id, subject, body_text, body_html, email")
        .eq("id", data)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (!row) return { action: "skip" };
      return { action: "send", id: row.id, message: messageFrom(row as QueueRow) };
    },
    async markSent(id, now) {
      const { error } = await admin
        .from("lifecycle_email_queue")
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    async release(id) {
      const { error } = await admin
        .from("lifecycle_email_queue")
        .update({ claimed_at: null })
        .eq("id", id)
        .eq("status", "queued");
      if (error) throw new Error(error.message);
    },
    async skip(id) {
      const { error } = await admin.from("lifecycle_email_queue").update({ status: "skipped" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async optedOut(userId) {
      const { data, error } = await admin
        .from("lifecycle_email_opt_outs")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return Boolean(data?.user_id);
    },
  };
}

export async function recordLifecycleOptOut(admin: SupabaseClient, userId: string, now = new Date()) {
  const { error } = await admin.from("lifecycle_email_opt_outs").upsert(
    { user_id: userId, opted_out_at: now.toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}
