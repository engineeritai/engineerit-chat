import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { shouldForwardSignupConfirm } from "../lib/authCallback";
import { unknownAcquisition, type Acquisition } from "../lib/acquisition";
import { planOAuthSignup } from "../lib/acquisition";
import { trackOAuthSignup } from "../lib/attribution";
import {
  GOOGLE_AUTH_FLAG,
  GOOGLE_CLOUD_JAVASCRIPT_ORIGINS,
  SUPABASE_GOOGLE_REDIRECT_URLS,
  googleAuthEnabled,
  googleCallbackError,
  googleLandingPath,
  googleRedirectUrl,
  oauthMetadataPatch,
  parseGooglePending,
  serializeGooglePending,
  supabaseGoogleCallback,
} from "../lib/googleAuth";
import { registrationFieldErrors, registrationMessage, validateRegistration } from "../lib/registerAccount";
import { shellCopy } from "../lib/shell";
import { TERMS_VERSION } from "../lib/termsAcceptance";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");
const CREATED = "2026-11-18T11:59:30.000Z";
const SIGNED = "2026-11-18T11:59:40.000Z";

const linkedin: Acquisition = {
  source: "linkedin",
  medium: "social",
  campaign: "launch-post",
  via: "utm",
  expiresAt: NOW + 1000,
};

function googleUser(overrides: Record<string, unknown> = {}) {
  return {
    created_at: CREATED,
    last_sign_in_at: SIGNED,
    email_confirmed_at: CREATED,
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: {
      acq_source: "linkedin",
      acq_medium: "social",
      acq_campaign: "launch-post",
      acq_via: "utm",
    },
    ...overrides,
  };
}

describe("google sign-in flag and redirect URLs", () => {
  it("stays hidden unless the flag is exactly true", () => {
    assert.equal(GOOGLE_AUTH_FLAG, "NEXT_PUBLIC_GOOGLE_AUTH");
    assert.equal(googleAuthEnabled("true"), true);
    assert.equal(googleAuthEnabled("1"), false);
    assert.equal(googleAuthEnabled("TRUE"), false);
    assert.equal(googleAuthEnabled(undefined), false);
    assert.equal(googleAuthEnabled(""), false);
  });

  it("uses the production callback URLs for engineerit.ai", () => {
    assert.deepEqual(SUPABASE_GOOGLE_REDIRECT_URLS, [
      "https://engineerit.ai/auth/callback",
      "https://www.engineerit.ai/auth/callback",
    ]);
    assert.deepEqual(GOOGLE_CLOUD_JAVASCRIPT_ORIGINS, ["https://engineerit.ai", "https://www.engineerit.ai"]);
    assert.equal(googleRedirectUrl("https://engineerit.ai"), "https://engineerit.ai/auth/callback");
    assert.equal(googleRedirectUrl("https://engineerit.ai/"), "https://engineerit.ai/auth/callback");
    assert.equal(googleRedirectUrl("https://www.engineerit.ai"), "https://www.engineerit.ai/auth/callback");
    assert.equal(supabaseGoogleCallback("https://abcdefgh.supabase.co/"), "https://abcdefgh.supabase.co/auth/v1/callback");
  });

  it("does not let the email confirmation forward consume the Google return", () => {
    assert.equal(shouldForwardSignupConfirm("/auth/callback", "?code=abc", ""), false);
    assert.equal(shouldForwardSignupConfirm("/auth/callback", "", "#access_token=a&refresh_token=b"), false);
    assert.equal(shouldForwardSignupConfirm("/", "?code=abc", ""), true);
    assert.equal(shouldForwardSignupConfirm("/", "", "#access_token=a&type=signup"), true);
    assert.equal(googleCallbackError("?error=access_denied&error_description=no", ""), true);
    assert.equal(googleCallbackError("?code=abc", ""), false);
  });
});

describe("short registration form", () => {
  it("asks only for email, password, and the terms agreement", () => {
    const register = readFileSync("app/register/page.tsx", "utf8");
    const profile = readFileSync("app/profile/page.tsx", "utf8");
    assert.doesNotMatch(register, /s\.auth\.fullName|s\.auth\.confirmEmail|s\.auth\.confirmPassword/);
    assert.match(register, /htmlFor="register-email"/);
    assert.match(register, /htmlFor="register-password"/);
    assert.match(register, /id="register-terms"/);
    assert.match(register, /role="alert"/);
    assert.match(register, /setSuccessMessage\(s\.auth\.createdConfirm\)/);
    assert.match(register, /\{s\.auth\.emailConfirmTitle\}/);
    assert.match(register, /\{successMessage\}/);
    assert.match(register, /\{s\.auth\.emailConfirmHint\}/);
    assert.match(profile, /s\.profile\.fullName/);
    assert.match(profile, /s\.profile\.jobTitle/);
    assert.match(profile, /s\.profile\.company/);
    assert.match(profile, /s\.profile\.phone/);
    assert.equal(validateRegistration({ email: "nora@example.com", password: "engineer1", accepted: true }).ok, true);
    const fields = registrationFieldErrors({ email: "nora", password: "short", accepted: false });
    assert.equal(fields.email, "email_invalid");
    assert.equal(fields.password, "password_short");
    assert.equal(fields.terms, "policy");
    assert.equal(registrationMessage("en", "email_invalid"), shellCopy.en.auth.emailInvalid);
    assert.equal(registrationMessage("ar", "email_invalid"), shellCopy.ar.auth.emailInvalid);
    assert.match(registrationMessage("en", "email_required"), /email/i);
    assert.match(registrationMessage("ar", "email_required"), /بريد/);
    assert.match(registrationMessage("en", "password_short"), /8/);
    assert.match(registrationMessage("ar", "password_short"), /8/);
    assert.match(registrationMessage("en", "policy"), /Terms/);
    assert.match(registrationMessage("ar", "policy"), /سياسة/);
    assert.doesNotMatch(
      `${shellCopy.ar.auth.continueGoogle}${shellCopy.ar.auth.googleFailed}${shellCopy.ar.auth.passwordHint}${shellCopy.ar.auth.emailRequired}`,
      /[\u064B-\u0652]/
    );
    assert.match(shellCopy.en.auth.createdConfirm, /inbox/);
    assert.match(shellCopy.en.auth.createdConfirm, /junk folder/);
    assert.match(shellCopy.ar.auth.createdConfirm, /الوارد/);
    assert.match(shellCopy.ar.auth.createdConfirm, /البريد غير الهام/);
  });
});

describe("google signup counts once and keeps the source", () => {
  it("fires register_completed once for a new Google account and not for a later sign-in", () => {
    const sent: { name: string; props: Record<string, string | number | boolean> }[] = [];
    const sink = (name: string, props: Record<string, string | number | boolean>) => sent.push({ name, props });
    const user = googleUser();
    const first = trackOAuthSignup(user, { nowMs: NOW, seen: [], allow: true, sink, local: unknownAcquisition(NOW) });
    assert.equal(first.track, true);
    assert.deepEqual(sent, [{ name: "register_completed", props: { source: "linkedin", via: "utm" } }]);
    assert.equal(JSON.stringify(sent).includes("launch-post"), false);
    const second = trackOAuthSignup(user, {
      nowMs: NOW,
      seen: first.track ? first.seen : [],
      allow: true,
      sink,
      local: unknownAcquisition(NOW),
    });
    assert.equal(second.track, false);
    assert.equal(sent.length, 1);

    const returning = planOAuthSignup({
      user: googleUser({
        created_at: "2026-11-18T11:50:00.000Z",
        last_sign_in_at: "2026-11-18T12:00:00.000Z",
        email_confirmed_at: "2026-11-18T11:50:00.000Z",
      }),
      nowMs: NOW,
      seen: [],
      local: linkedin,
    });
    assert.equal(returning.track, false);
    const later = planOAuthSignup({
      user: googleUser({ created_at: "2026-11-17T12:00:00.000Z", last_sign_in_at: CREATED, email_confirmed_at: "2026-11-17T12:00:00.000Z" }),
      nowMs: NOW,
      seen: [],
      local: linkedin,
    });
    assert.equal(later.track, false);
    const email = planOAuthSignup({
      user: googleUser({ app_metadata: { provider: "email" }, identities: [{ provider: "email" }] }),
      nowMs: NOW,
      seen: [],
      local: linkedin,
    });
    assert.equal(email.track, false);
  });

  it("stores the whitelisted source on a new Google account and leaves an existing source alone", () => {
    const fresh = oauthMetadataPatch({
      existing: {},
      fresh: true,
      acquisition: { source: "linkedin", medium: "social", campaign: "launch-post", via: "utm", email: "hidden.person@example.com" },
      termsAcceptedAt: "2026-11-18T11:59:00.000Z",
      pending: { planId: "engineer", interval: "year", extraSeats: 0 },
    });
    assert.equal(fresh.acq_source, "linkedin");
    assert.equal(fresh.acq_via, "utm");
    assert.equal(fresh.acq_campaign, "launch-post");
    assert.equal(fresh.terms_accepted_at, "2026-11-18T11:59:00.000Z");
    assert.equal(fresh.terms_version, TERMS_VERSION);
    assert.equal((fresh.pending_checkout as { planId?: string }).planId, "engineer");
    assert.equal(JSON.stringify(fresh).includes("@"), false);

    const kept = oauthMetadataPatch({
      existing: { acq_source: "email", acq_via: "utm", terms_accepted_at: "2026-01-01T00:00:00.000Z" },
      fresh: true,
      acquisition: linkedin,
      termsAcceptedAt: "2026-11-18T11:59:00.000Z",
    });
    assert.equal(kept.acq_source, undefined);
    assert.equal(kept.terms_accepted_at, undefined);

    const returning = oauthMetadataPatch({
      existing: {},
      fresh: false,
      acquisition: linkedin,
      termsAcceptedAt: "not-a-time",
    });
    assert.deepEqual(returning, {});

    const raw = serializeGooglePending({
      next: "https://evil.example/phish",
      termsAcceptedAt: "2026-11-18T11:59:00.000Z",
      acquisition: { source: "<script>", campaign: "owner@example.com", via: "utm" },
      pending: { planId: "assistant" },
    });
    const pending = parseGooglePending(raw);
    assert.equal(pending?.next, null);
    assert.equal(pending?.acquisition.source, "unknown");
    assert.equal(pending?.pending, null);
    assert.equal(JSON.stringify(pending).includes("evil"), false);
    assert.equal(JSON.stringify(pending).includes("@"), false);
    assert.equal(
      googleLandingPath({ queryNext: null, storedNext: null, pendingNext: pending?.next, hasCheckout: true }),
      "/checkout/continue"
    );
    assert.equal(googleLandingPath({ queryNext: "/chat", hasCheckout: true }), "/chat");
    assert.equal(googleLandingPath({ hasCheckout: false }), "/profile");
  });

  it("keeps Google on the same post-sign-in path as email and off the login event", () => {
    const callback = readFileSync("app/auth/callback/page.tsx", "utf8");
    const login = readFileSync("app/login/page.tsx", "utf8");
    const button = readFileSync("app/components/GoogleAuthButton.tsx", "utf8");
    assert.match(callback, /trackOAuthSignup/);
    assert.match(callback, /\/api\/profile\/ensure/);
    assert.match(callback, /googleLandingPath/);
    assert.equal(callback.match(/trackOAuthSignup\(/g)?.length, 1);
    assert.doesNotMatch(callback, /trackProduct\(/);
    assert.doesNotMatch(login, /register_completed|trackProduct|trackConfirmedSignup|trackOAuthSignup/);
    assert.match(button, /redirectTo: googleRedirectUrl/);
    assert.match(button, /readAcquisitionPayload/);
    assert.doesNotMatch(readFileSync("lib/authEmail.ts", "utf8"), /emailRedirectTo|email_confirm/);
  });
});
