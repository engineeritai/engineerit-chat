export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
}

/** When TURNSTILE_SECRET_KEY is unset, signup stays open and the widget stays hidden. */
export async function verifyTurnstile(token: string, ip: string, env: NodeJS.ProcessEnv = process.env) {
  const secret = env.TURNSTILE_SECRET_KEY || "";
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, skipped: false };
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await response.json().catch(() => null)) as { success?: boolean } | null;
  return { ok: Boolean(data?.success), skipped: false };
}
