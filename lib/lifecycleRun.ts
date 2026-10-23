import type { OutboundMail } from "@/lib/mail";
import {
  buildLifecycleMessage,
  claimOutcome,
  lifecycleUnsubscribeToken,
  selectDueLifecycle,
  type ClaimSnapshot,
  type LifecycleCandidate,
} from "@/lib/lifecycleMail";

export type MailSendResult = {
  sent: boolean;
  sink: "log" | "mailpit" | null;
  reason: string;
};

export type LifecycleClaimInput = {
  userId: string;
  email: string;
  cycleKey: string;
  kind: "feedback" | "feedback_subscribe";
  locale: "en" | "ar" | "both";
  subject: string;
  text: string;
  html: string;
  nowMs: number;
};

export type LifecycleClaimResult = { action: "skip" } | { action: "send"; id: string; message: OutboundMail };

export type LifecycleMailer = {
  claim(input: LifecycleClaimInput): Promise<LifecycleClaimResult>;
  markSent(id: string, now: Date): Promise<void>;
  release(id: string): Promise<void>;
  skip(id: string): Promise<void>;
  optedOut(userId: string): Promise<boolean>;
};

export type LifecycleRunResult = {
  enabled: boolean;
  dryRun: boolean;
  considered: number;
  due: number;
  sent: number;
  skipped: number;
  failed: number;
};

export async function runLifecycleEmails(args: {
  now: Date;
  enabled: boolean;
  dryRun: boolean;
  limit: number;
  secret: string;
  appUrl: string;
  users: LifecycleCandidate[];
  mailer: LifecycleMailer;
  deliver: (message: OutboundMail) => Promise<MailSendResult>;
}): Promise<LifecycleRunResult> {
  const result: LifecycleRunResult = {
    enabled: args.enabled,
    dryRun: args.dryRun,
    considered: args.users.length,
    due: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };
  if (!args.enabled && !args.dryRun) return result;
  if (!args.secret) throw new Error("CRON_SECRET is required to sign unsubscribe links.");

  const due = selectDueLifecycle(args.users, args.now, args.limit);
  result.due = due.length;
  if (args.dryRun) return result;

  const origin = args.appUrl.replace(/\/$/, "");
  for (const user of due) {
    const token = lifecycleUnsubscribeToken(user.id, args.secret);
    const feedbackUrl = user.locale ? `${origin}/feedback/review?lang=${user.locale}` : `${origin}/feedback/review`;
    const unsubscribeUrl = `${origin}/api/lifecycle/unsubscribe?token=${encodeURIComponent(token)}`;
    const copy = buildLifecycleMessage({
      locale: user.locale,
      paid: user.paid,
      feedbackUrl,
      unsubscribeUrl,
    });
    const claim = await args.mailer.claim({
      userId: user.id,
      email: user.email,
      cycleKey: user.cycleKey,
      kind: copy.kind,
      locale: copy.locale,
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
      nowMs: args.now.getTime(),
    });
    if (claim.action === "skip") {
      result.skipped += 1;
      continue;
    }
    if (await args.mailer.optedOut(user.id)) {
      await args.mailer.skip(claim.id);
      result.skipped += 1;
      continue;
    }
    const message: OutboundMail = {
      ...claim.message,
      extraHeaders: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
    try {
      const sent = await args.deliver(message);
      if (sent.sent) {
        await args.mailer.markSent(claim.id, args.now);
        result.sent += 1;
      } else {
        await args.mailer.release(claim.id);
        result.failed += 1;
        if (sent.reason === "not-configured") break;
      }
    } catch {
      await args.mailer.release(claim.id);
      result.failed += 1;
    }
  }
  return result;
}

export type MemoryRow = ClaimSnapshot & {
  id: string;
  userId: string;
  cycleKey: string;
  message: OutboundMail;
};

/** In-memory queue with the same claim rules as the SQL function. Used by tests. */
export function memoryLifecycleMailer(optedOut: Set<string> = new Set()) {
  const rows = new Map<string, MemoryRow>();
  let sequence = 0;
  const keyOf = (userId: string, cycleKey: string) => `${userId}:${cycleKey}`;

  const mailer: LifecycleMailer = {
    async claim(input) {
      const key = keyOf(input.userId, input.cycleKey);
      const existing = rows.get(key) ?? null;
      const outcome = claimOutcome(existing, input.nowMs);
      if (outcome === "skip") return { action: "skip" };
      const message: OutboundMail = {
        to: input.email,
        subject: input.subject,
        text: input.text,
        html: input.html,
        fromName: "engineerit.ai",
        fromAddress: "support@engineerit.ai",
        replyTo: "support@engineerit.ai",
      };
      if (outcome === "insert" || !existing) {
        sequence += 1;
        const row: MemoryRow = {
          id: `m${sequence}`,
          userId: input.userId,
          cycleKey: input.cycleKey,
          status: "queued",
          claimedAt: input.nowMs,
          message,
        };
        rows.set(key, row);
        return { action: "send", id: row.id, message };
      }
      existing.claimedAt = input.nowMs;
      return { action: "send", id: existing.id, message: existing.message };
    },
    async markSent(id, now) {
      const row = [...rows.values()].find((item) => item.id === id);
      if (!row) return;
      row.status = "sent";
      row.claimedAt = now.getTime();
    },
    async release(id) {
      const row = [...rows.values()].find((item) => item.id === id);
      if (!row || row.status !== "queued") return;
      row.claimedAt = null;
    },
    async skip(id) {
      const row = [...rows.values()].find((item) => item.id === id);
      if (!row) return;
      row.status = "skipped";
    },
    async optedOut(userId) {
      return optedOut.has(userId);
    },
  };

  return { mailer, rows, optedOut };
}
