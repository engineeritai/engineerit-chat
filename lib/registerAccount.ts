import { shellCopy } from "@/lib/shell";
import type { Locale } from "@/lib/i18n";

export type RegistrationCode =
  | "email_required"
  | "email_invalid"
  | "email_mismatch"
  | "password_short"
  | "password_mismatch"
  | "policy"
  | "captcha"
  | "duplicate"
  | "later"
  | "generic";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegistrationFields = {
  email?: RegistrationCode;
  password?: RegistrationCode;
  terms?: RegistrationCode;
};

/** Every problem on the short form, so each field can show its own message. */
export function registrationFieldErrors(input: {
  email: string;
  password: string;
  accepted: boolean;
}): RegistrationFields {
  const errors: RegistrationFields = {};
  const email = input.email.trim().toLowerCase();
  if (!email) errors.email = "email_required";
  else if (!EMAIL_SHAPE.test(email)) errors.email = "email_invalid";
  if (input.password.length < 8) errors.password = "password_short";
  if (!input.accepted) errors.terms = "policy";
  return errors;
}

export function validateRegistration(input: {
  email: string;
  confirmEmail?: string;
  password: string;
  confirmPassword?: string;
  accepted: boolean;
}): { ok: true } | { ok: false; code: RegistrationCode } {
  const email = input.email.trim().toLowerCase();
  if (input.confirmEmail !== undefined) {
    const confirmEmail = input.confirmEmail.trim().toLowerCase();
    if (!email || !confirmEmail) return { ok: false, code: "email_required" };
    if (!EMAIL_SHAPE.test(email) || !EMAIL_SHAPE.test(confirmEmail)) return { ok: false, code: "email_invalid" };
    if (email !== confirmEmail) return { ok: false, code: "email_mismatch" };
  } else if (!email) return { ok: false, code: "email_required" };
  else if (!EMAIL_SHAPE.test(email)) return { ok: false, code: "email_invalid" };
  if (input.password.length < 8) return { ok: false, code: "password_short" };
  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
    return { ok: false, code: "password_mismatch" };
  }
  if (!input.accepted) return { ok: false, code: "policy" };
  return { ok: true };
}

export function classifySignupError(message: string): RegistrationCode {
  if (/already registered|already been registered|already exists|user exists|email address.*taken/i.test(message)) {
    return "duplicate";
  }
  if (/rate|too many|over_email_send_rate/i.test(message)) return "later";
  if (/captcha|turnstile/i.test(message)) return "captcha";
  if (/password/i.test(message) && /8|short|least/i.test(message)) return "password_short";
  if (/valid email|email/i.test(message) && /invalid|valid/i.test(message)) return "email_invalid";
  return "generic";
}

export function isDuplicateSignup(user: { identities?: unknown[] | null } | null | undefined) {
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}

export function signInProblem(locale: Locale, message: string) {
  const auth = shellCopy[locale].auth;
  if (/not confirmed|email_not_confirmed/i.test(message)) return auth.emailNotConfirmed;
  if (/invalid login|invalid credentials|invalid email or password/i.test(message)) return auth.invalidLogin;
  return auth.unable;
}

export function registrationMessage(locale: Locale, code: RegistrationCode) {
  const auth = shellCopy[locale].auth;
  const password = shellCopy[locale].password;
  const messages: Record<RegistrationCode, string> = {
    email_required: auth.emailRequired,
    email_invalid: auth.emailInvalid,
    email_mismatch: auth.emailMismatch,
    password_short: auth.passwordMin,
    password_mismatch: auth.passwordMismatch,
    policy: auth.policyRequired,
    captcha: auth.captchaRequired,
    duplicate: auth.duplicateEmail,
    later: password.tryLater,
    generic: auth.genericError,
  };
  return messages[code];
}

