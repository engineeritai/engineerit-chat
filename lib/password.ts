export const PASSWORD_MIN = 8;
export const RESET_REDIRECT = "https://engineerit.ai/reset-password";

export type PasswordStrength = "empty" | "short" | "ok" | "strong";
export type ResetResult = "sent" | "later" | "failed";

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  if (password.length < PASSWORD_MIN) return "short";
  const hasLetter = /[A-Za-z\u0600-\u06FF]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber ? "strong" : "ok";
}

export function passwordProblem(password: string, confirm: string): "short" | "mismatch" | null {
  if (password.length < PASSWORD_MIN) return "short";
  if (password !== confirm) return "mismatch";
  return null;
}

/** Public reset must not reveal whether the email is registered. */
export function classifyResetError(message: string): ResetResult {
  if (/rate|too many|over_email_send_rate|email rate/i.test(message)) return "later";
  if (/redirect|not allowed|validation_failed/i.test(message)) return "failed";
  return "sent";
}
