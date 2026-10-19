const hits = new Map<string, number[]>();
const alerts = new Set<string>();

export const AUTH_EMAIL_ADDRESS_LIMIT = 3;
export const AUTH_EMAIL_IP_LIMIT = 20;
export const AUTH_EMAIL_HOUR_MS = 60 * 60 * 1000;

export function authEmailDailyCap(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.AUTH_EMAIL_DAILY_CAP || 100);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export function resetAuthRateLimits() {
  hits.clear();
  alerts.clear();
}

function take(key: string, limit: number, windowMs: number, now: number): boolean {
  const recent = (hits.get(key) || []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Shared bucket for signup, reset, and resend. */
export function checkAuthRate(args: {
  email: string;
  ip: string;
  now?: number;
  dailyCap?: number;
}): { ok: true } | { ok: false; scope: "address" | "ip" | "daily"; alert?: string } {
  const now = args.now ?? Date.now();
  const email = args.email.trim().toLowerCase();
  const ip = args.ip || "unknown";
  const cap = args.dailyCap ?? authEmailDailyCap();
  if (!take(`addr:${email}`, AUTH_EMAIL_ADDRESS_LIMIT, AUTH_EMAIL_HOUR_MS, now)) {
    return { ok: false, scope: "address" };
  }
  if (!take(`ip:${ip}`, AUTH_EMAIL_IP_LIMIT, AUTH_EMAIL_HOUR_MS, now)) {
    return { ok: false, scope: "ip" };
  }
  return { ok: true };
}

/** Counts only messages that will actually leave via Supabase or SMTP. */
export function consumeAuthDaily(now = Date.now(), cap = authEmailDailyCap()): { ok: true } | { ok: false; alert?: string } {
  const day = new Date(now).toISOString().slice(0, 10);
  if (take(`day:${day}`, cap, 36 * AUTH_EMAIL_HOUR_MS, now)) return { ok: true };
  const alertKey = `alert:${day}`;
  if (alerts.has(alertKey)) return { ok: false };
  alerts.add(alertKey);
  const alert = `AUTH_EMAIL_DAILY_CAP ${cap} reached on ${day}`;
  console.error(alert);
  return { ok: false, alert };
}
