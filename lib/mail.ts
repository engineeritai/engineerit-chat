import nodemailer from "nodemailer";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getMailer() {
  const host = process.env.ZSMTP_HOST;
  const port = Number(process.env.ZSMTP_PORT || "465");
  const user = process.env.ZSMTP_USER;
  const pass = process.env.ZSMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const salesTo =
    (process.env.SALES_TO_EMAIL && process.env.SALES_TO_EMAIL.trim()) ||
    (process.env.FEEDBACK_TO_EMAIL && process.env.FEEDBACK_TO_EMAIL.trim()) ||
    user;

  return { transporter, from: user, salesTo };
}

export function appBaseUrl(req?: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (req) {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`.replace(/\/$/, "");
  }
  return "";
}
