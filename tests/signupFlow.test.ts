import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { authCallbackKind, shouldForwardSignupConfirm } from "../lib/authCallback";
import { handleAuthEmail } from "../lib/authEmail";
import { resetAuthRateLimits } from "../lib/authRateLimit";
import { newProfileRow } from "../lib/ensureProfile";
import { RESET_REDIRECT } from "../lib/password";
import { parsePendingCheckout, pendingFromMetadata } from "../lib/pendingCheckout";
import {
  classifySignupError,
  isDuplicateSignup,
  registrationMessage,
  signInProblem,
  validateRegistration,
} from "../lib/registerAccount";
import { shellCopy } from "../lib/shell";

const valid = {
  email: "nora@example.com",
  confirmEmail: "nora@example.com",
  password: "engineer1",
  confirmPassword: "engineer1",
  accepted: true,
};

describe("registration validation", () => {
  it("accepts a matching email and an 8 character password", () => {
    assert.deepEqual(validateRegistration(valid), { ok: true });
  });

  it("rejects empty, invalid, and mismatched emails in English and Arabic", () => {
    assert.equal(validateRegistration({ ...valid, email: "", confirmEmail: "" }).ok, false);
    assert.equal(validateRegistration({ ...valid, email: "nora", confirmEmail: "nora" }).ok, false);
    const mismatch = validateRegistration({ ...valid, confirmEmail: "other@example.com" });
    assert.equal(mismatch.ok, false);
    if (mismatch.ok) return;
    assert.equal(registrationMessage("en", mismatch.code), shellCopy.en.auth.emailMismatch);
    assert.equal(registrationMessage("ar", mismatch.code), shellCopy.ar.auth.emailMismatch);
    assert.notEqual(shellCopy.en.auth.emailInvalid, shellCopy.ar.auth.emailInvalid);
    assert.match(shellCopy.ar.auth.emailRequired, /البريد/);
    assert.match(shellCopy.en.auth.passwordMin, /8/);
    assert.match(shellCopy.ar.auth.passwordMin, /8/);
  });

  it("localizes the first sign-in when the email is still unconfirmed or the password is wrong", () => {
    assert.match(signInProblem("en", "Email not confirmed"), /Confirm your email/);
    assert.match(signInProblem("ar", "Email not confirmed"), /أكد بريدك/);
    assert.doesNotMatch(signInProblem("ar", "Invalid login credentials"), /Invalid/);
    assert.match(signInProblem("en", "Invalid login credentials"), /not right/);
    assert.match(signInProblem("ar", "something else"), /تعذر الدخول/);
  });

  it("rejects a short password, a mismatch, and a missing policy agreement", () => {
    assert.equal(validateRegistration({ ...valid, password: "short", confirmPassword: "short" }).ok, false);
    const mismatch = validateRegistration({ ...valid, confirmPassword: "engineer2" });
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) assert.equal(mismatch.code, "password_mismatch");
    const policy = validateRegistration({ ...valid, accepted: false });
    assert.equal(policy.ok, false);
    if (!policy.ok) {
      assert.match(registrationMessage("en", policy.code), /policy/i);
      assert.match(registrationMessage("ar", policy.code), /سياسة/);
    }
  });
});

describe("duplicate email and confirmation links", () => {
  it("treats an existing account as a sign-in, in both languages", () => {
    assert.equal(classifySignupError("User already registered"), "duplicate");
    assert.equal(classifySignupError("A user with this email address has already been registered"), "duplicate");
    assert.equal(isDuplicateSignup({ identities: [] }), true);
    assert.equal(isDuplicateSignup({ identities: [{ id: "user" }] }), false);
    assert.equal(isDuplicateSignup(null), false);
    assert.match(registrationMessage("en", "duplicate"), /Sign in/);
    assert.match(registrationMessage("ar", "duplicate"), /سجل الدخول/);
    assert.doesNotMatch(registrationMessage("ar", "duplicate"), /Sign in/);
  });

  it("uses the confirmation and reset redirects already on main", () => {
    assert.equal(RESET_REDIRECT, "https://engineerit.ai/reset-password");
    const auth = readFileSync("lib/authEmail.ts", "utf8");
    const main = readFileSync("lib/password.ts", "utf8");
    assert.match(main, /RESET_REDIRECT = "https:\/\/engineerit\.ai\/reset-password"/);
    assert.match(auth, /RESET_REDIRECT/);
    assert.doesNotMatch(auth, /emailRedirectTo/);
    assert.doesNotMatch(auth, /auth\/confirmed/);
    assert.equal(authCallbackKind("", "#access_token=a&refresh_token=b&type=signup"), "signup");
    assert.equal(authCallbackKind("?type=recovery", ""), "recovery");
    assert.equal(authCallbackKind("?code=abc", ""), "none");
    assert.equal(shouldForwardSignupConfirm("/", "?code=abc", ""), true);
    assert.equal(shouldForwardSignupConfirm("/reset-password", "?code=abc", ""), false);
    assert.equal(shouldForwardSignupConfirm("/reset-password", "", "#type=signup"), true);
    assert.equal(shouldForwardSignupConfirm("/reset-password", "?type=recovery", ""), false);
    assert.equal(shouldForwardSignupConfirm("/auth/confirmed", "#type=signup", ""), false);
    const forward = readFileSync("app/components/SignupConfirmForward.tsx", "utf8");
    assert.match(forward, /\/auth\/confirmed/);
    assert.match(forward, /\/api\/profile\/ensure/);
    const reset = readFileSync("app/reset-password/page.tsx", "utf8");
    assert.match(reset, /authCallbackKind/);
    assert.match(reset, /=== "signup"/);
  });

  it("keeps the chosen plan on the account and gives register a sign-in path", () => {
    const pending = { planId: "engineer" as const, interval: "year" as const, extraSeats: 2 };
    assert.deepEqual(pendingFromMetadata(pending), pending);
    assert.equal(pendingFromMetadata({ planId: "assistant" }), null);
    assert.deepEqual(parsePendingCheckout(JSON.parse(JSON.stringify(pending))), pending);
    const register = readFileSync("app/register/page.tsx", "utf8");
    const confirmed = readFileSync("app/auth/confirmed/page.tsx", "utf8");
    assert.match(register, /continueSignIn/);
    assert.match(register, /loginHref/);
    assert.match(register, /pending/);
    assert.match(confirmed, /exchangeCodeForSession/);
    assert.match(confirmed, /continueSignIn/);
    assert.match(confirmed, /\/api\/profile\/ensure/);
    assert.match(shellCopy.en.auth.planWaiting, /checkout/i);
    assert.match(shellCopy.ar.auth.planWaiting, /الدفع/);
  });
});

describe("profile row on first login", () => {
  it("inserts an assistant profile without a card or a paid plan", () => {
    const row = newProfileRow({
      id: "11111111-1111-4111-8111-111111111111",
      email: "nora@example.com",
      user_metadata: { full_name: "Nora Ahmed" },
    });
    assert.equal(row.subscription_tier, "assistant");
    assert.equal(row.full_name, "Nora Ahmed");
    assert.equal("number" in row, false);
    const sql = readFileSync("supabase/migrations/20261023150000_profile_on_signup.sql", "utf8");
    assert.match(sql, /enable row level security/);
    assert.match(sql, /revoke all on public\.profiles from public, anon/);
    assert.match(sql, /grant select, insert, update on public\.profiles to authenticated/);
    assert.match(sql, /grant select, insert, update, delete on public\.profiles to service_role/);
    assert.match(sql, /profiles_insert_own/);
    assert.match(sql, /profiles_select_own/);
    assert.match(sql, /profiles_update_own/);
    assert.match(sql, /handle_new_user/);
    assert.match(sql, /on conflict \(id\) do nothing/);
    assert.match(sql, /NOT REQUIRED/);
    assert.match(sql, /status in \('pending', 'paid', 'cancelled'\)/);
    const ensure = readFileSync("app/api/profile/ensure/route.ts", "utf8");
    assert.match(ensure, /newProfileRow/);
    assert.doesNotMatch(ensure, /handle_new_user/);
    const profile = readFileSync("app/profile/page.tsx", "utf8");
    const upsert = profile.slice(profile.indexOf(".upsert("), profile.indexOf("onConflict"));
    assert.doesNotMatch(upsert, /subscription_tier/);
    const login = readFileSync("app/login/page.tsx", "utf8");
    assert.match(login, /\/api\/profile\/ensure/);
    assert.match(login, /requestAuthEmail\("resend"/);
    assert.match(login, /signInProblem/);
    const reset = readFileSync("app/reset-password/page.tsx", "utf8");
    assert.match(reset, /exchangeCodeForSession/);
    assert.match(reset, /\/forgot-password/);
    const forgot = readFileSync("app/forgot-password/page.tsx", "utf8");
    assert.match(forgot, /s\.password\.ifExists/);
    assert.match(forgot, /s\.password\.tryLater/);
    assert.match(forgot, /\/login/);
  });
});

describe("confirmation and reset email", () => {
  const previous = {
    MAIL_TRANSPORT: process.env.MAIL_TRANSPORT,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAuthRateLimits();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function request(path: string, body: unknown, headers?: Record<string, string>) {
    return new Request(`https://engineerit.ai${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  it("asks Supabase to email the confirmation and reset links, and does not call Moyasar", async () => {
    process.env.MAIL_TRANSPORT = "";
    process.env.VERCEL_ENV = "production";
    (process.env as Record<string, string>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3000";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    delete process.env.TURNSTILE_SECRET_KEY;

    const calls: { url: string; body: Record<string, unknown> | null }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const raw = typeof init?.body === "string" ? init.body : "";
      calls.push({ url, body: raw ? (JSON.parse(raw) as Record<string, unknown>) : null });
      if (url.includes("/signup")) {
        return new Response(JSON.stringify({ id: "user-1", identities: [{ id: "identity-1" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/recover")) {
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ msg: "unexpected" }), { status: 500 });
    }) as typeof fetch;

    const signup = await handleAuthEmail(
      request("/api/auth/signup", {
        email: "nora.signup@example.com",
        password: "engineer1",
        pending: { planId: "engineer", interval: "year", extraSeats: 0 },
      }),
      "signup"
    );
    assert.equal(signup.status, 200);
    const signupBody = (await signup.json()) as { sent?: boolean; needsConfirmation?: boolean };
    assert.equal(signupBody.sent, true);
    assert.equal(signupBody.needsConfirmation, true);

    const reset = await handleAuthEmail(
      request("/api/auth/recover", { email: "nora.reset@example.com" }),
      "reset"
    );
    assert.equal(reset.status, 200);

    const signupCall = calls.find((call) => call.url.includes("/signup"));
    const resetCall = calls.find((call) => call.url.includes("/recover"));
    assert.equal(new URL(signupCall?.url || "https://invalid").searchParams.get("redirect_to"), null);
    assert.equal(JSON.stringify(signupCall?.body || {}).includes("auth/confirmed"), false);
    assert.equal(new URL(resetCall?.url || "https://invalid").searchParams.get("redirect_to"), "https://engineerit.ai/reset-password");
    const pending = (signupCall?.body?.data as { pending_checkout?: { planId?: string } } | undefined)?.pending_checkout;
    assert.equal(pending?.planId, "engineer");
    assert.equal(calls.some((call) => call.url.includes("moyasar") || call.url.includes("smtp")), false);
  });

  it("returns a duplicate code without sending when the account already exists", async () => {
    process.env.MAIL_TRANSPORT = "";
    process.env.VERCEL_ENV = "production";
    (process.env as Record<string, string>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    delete process.env.TURNSTILE_SECRET_KEY;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const raw = typeof init?.body === "string" ? init.body : "";
      const body = raw ? (JSON.parse(raw) as { email?: string }) : {};
      if (url.includes("/signup") && body.email === "taken.empty@example.com") {
        return new Response(JSON.stringify({ id: "user-1", identities: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ msg: "User already registered" }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const empty = await handleAuthEmail(
      request("/api/auth/signup", { email: "taken.empty@example.com", password: "engineer1" }),
      "signup"
    );
    assert.equal(empty.status, 409);
    assert.equal(((await empty.json()) as { code?: string }).code, "duplicate");

    const message = await handleAuthEmail(
      request("/api/auth/signup", { email: "taken.message@example.com", password: "engineer1" }),
      "signup"
    );
    assert.equal(message.status, 409);
    assert.equal(((await message.json()) as { code?: string }).code, "duplicate");
  });

  it("suppresses the confirmation email for the test mail sink", async () => {
    process.env.MAIL_TRANSPORT = "log";
    process.env.VERCEL_ENV = "development";
    (process.env as Record<string, string>).NODE_ENV = "test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-key";
    delete process.env.TURNSTILE_SECRET_KEY;

    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 500 });
    }) as typeof fetch;

    const response = await handleAuthEmail(
      request("/api/auth/signup", { email: "nora.sink@example.com", password: "engineer1" }, { "x-engineerit-test": "1" }),
      "signup"
    );
    const body = (await response.json()) as { ok?: boolean; sent?: boolean };
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.sent, false);
    assert.equal(called, false);
  });
});
