/** Owner stats use Arabia Standard Time (UTC+3, no daylight saving). */

export function riyadhWindows(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const todayStart = new Date(Date.UTC(year, month - 1, day, -3, 0, 0));
  const weekStart = new Date(Date.UTC(year, month - 1, day - 6, -3, 0, 0));
  return { todayStart, weekStart };
}

export function foldSignups(stamps: string[], todayMs: number, weekMs: number) {
  let today = 0;
  let days7 = 0;
  for (const stamp of stamps) {
    const ms = Date.parse(stamp);
    if (!Number.isFinite(ms) || ms < weekMs) continue;
    days7 += 1;
    if (ms >= todayMs) today += 1;
  }
  return { today, days7 };
}

export function countByPlan(plans: string[]) {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    const key = plan.trim() || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count || a.plan.localeCompare(b.plan));
}

export function sumSar(amounts: Array<number | string | null>) {
  return amounts.reduce<number>((sum, amount) => {
    const value = typeof amount === "number" ? amount : Number(amount);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}
