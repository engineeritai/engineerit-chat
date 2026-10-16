/**
 * Launch switch for AI Advisors.
 *
 * Coming soon until NEXT_PUBLIC_ADVISORS_LIVE is exactly "true".
 * The same value is read by the page and by the API, so a hidden
 * "Open advisor" control cannot run a playbook before launch.
 *
 * Optional NEXT_PUBLIC_ADVISORS_LAUNCHED_AT (ISO date) shows "Now live"
 * for 14 days after that instant. Public copy never includes the date.
 */
const NOW_LIVE_MS = 14 * 24 * 60 * 60 * 1000;

export function advisorsAreLive(): boolean {
  return process.env.NEXT_PUBLIC_ADVISORS_LIVE === "true";
}

export function advisorsNowLive(now = Date.now()): boolean {
  if (!advisorsAreLive()) return false;
  const raw = process.env.NEXT_PUBLIC_ADVISORS_LAUNCHED_AT;
  if (!raw) return false;
  const launched = Date.parse(raw);
  if (Number.isNaN(launched)) return false;
  const age = now - launched;
  return age >= 0 && age <= NOW_LIVE_MS;
}
