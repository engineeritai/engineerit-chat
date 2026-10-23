import crypto from "crypto";
import { emailMatchesDomain, type PromoDraft } from "@/lib/promo";

export const STUDENT_CODE = "STUDENT50";
export const STUDENT_PERCENT = 50;
export const STUDENT_CYCLES = 12;
export const STUDENT_PLANS = ["engineer"] as const;
export const STUDENT_DOMAINS = [".edu.sa", ".edu"] as const;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_SEND_LIMIT = 3;
export const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;
export const VERIFY_MONTHS = 12;
export const DOC_MAX_BYTES = 5 * 1024 * 1024;
export const DOC_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export function normalizeAcademicEmail(email: string) {
  return email.trim().toLowerCase();
}

export function academicEmailAllowed(email: string, domains: readonly string[] = STUDENT_DOMAINS) {
  const normalized = normalizeAcademicEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  return emailMatchesDomain(normalized, [...domains]);
}

export function hashStudentOtp(salt: string, code: string) {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export function newStudentOtp(now = new Date()) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    code,
    salt,
    codeHash: hashStudentOtp(salt, code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
  };
}

export function canSendStudentOtp(recent: { createdAt: string }[], now = new Date()) {
  const start = now.getTime() - OTP_SEND_WINDOW_MS;
  const count = recent.filter((row) => new Date(row.createdAt).getTime() >= start).length;
  return count < OTP_SEND_LIMIT;
}

export function checkStudentOtp(args: {
  now: Date;
  expiresAt: string;
  attempts: number;
  codeHash: string;
  salt: string;
  code: string;
}) {
  if (new Date(args.expiresAt).getTime() <= args.now.getTime()) return "expired" as const;
  if (args.attempts >= OTP_MAX_ATTEMPTS) return "too_many" as const;
  const digits = args.code.replace(/\D/g, "");
  if (digits.length !== 6 || hashStudentOtp(args.salt, digits) !== args.codeHash) return "mismatch" as const;
  return "ok" as const;
}

export function verifiedUntilFrom(now = new Date()) {
  const until = new Date(now.getTime());
  until.setUTCMonth(until.getUTCMonth() + VERIFY_MONTHS);
  return until.toISOString();
}

export function studentDiscountAllowed(verifiedUntil: string | null | undefined, now = new Date()) {
  if (!verifiedUntil) return false;
  const time = new Date(verifiedUntil).getTime();
  return Number.isFinite(time) && time > now.getTime();
}

export function claimAcademicEmail(existingUserId: string | null, userId: string) {
  if (existingUserId && existingUserId !== userId) return "taken" as const;
  return "ok" as const;
}

export function reviewStudentDocument(decision: "approve" | "reject", now = new Date()) {
  if (decision === "approve") {
    return { status: "approved" as const, verifiedUntil: verifiedUntilFrom(now) };
  }
  return { status: "rejected" as const, verifiedUntil: null };
}

export function studentBatchDraft(input: { percentOff?: number; cycles?: number; label?: string } = {}): PromoDraft {
  return {
    label: input.label || "Student 50%",
    discountType: "percent",
    percentOff: input.percentOff ?? STUDENT_PERCENT,
    plans: [...STUDENT_PLANS],
    intervals: ["month"],
    cycles: input.cycles ?? STUDENT_CYCLES,
    audience: "batch",
    domains: [],
    requiresStudent: true,
    singleUse: true,
    note: "50% off the Engineer plan, monthly, after student verification.",
  };
}

export function studentOtpMail(to: string, code: string) {
  return {
    to,
    subject: "engineerit.ai student verification",
    text: `Your engineerit.ai student code is ${code}. It expires in 10 minutes. If you did not ask for this, ignore this email.`,
  };
}

export async function issueStudentOtp(args: {
  now?: Date;
  recent: { createdAt: string }[];
  email: string;
  domains?: readonly string[];
  send: (message: { to: string; subject: string; text: string; code: string }) => Promise<void>;
}) {
  const now = args.now || new Date();
  const email = normalizeAcademicEmail(args.email);
  if (!academicEmailAllowed(email, args.domains || STUDENT_DOMAINS)) {
    return { ok: false as const, reason: "domain" as const };
  }
  if (!canSendStudentOtp(args.recent, now)) {
    return { ok: false as const, reason: "rate" as const };
  }
  const otp = newStudentOtp(now);
  const mail = studentOtpMail(email, otp.code);
  await args.send({ ...mail, code: otp.code });
  return { ok: true as const, email, otp };
}
