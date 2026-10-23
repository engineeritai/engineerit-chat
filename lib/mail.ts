import nodemailer from "nodemailer";
import { isProductionMailRuntime, mailDecision } from "@/lib/mailPolicy";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type OutboundMail = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  bcc?: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  headers?: { get(name: string): string | null };
  /** SMTP address. Defaults to the configured mailbox. */
  fromAddress?: string;
  extraHeaders?: Record<string, string>;
};

function fromHeader(message: OutboundMail, fallbackAddress: string) {
  const address = message.fromAddress?.trim() || fallbackAddress;
  const name = (message.fromName || "engineerit.ai").replace(/"/g, "");
  return `"${name}" <${address}>`;
}

export async function deliverMail(message: OutboundMail) {
  const decision = mailDecision({
    to: [message.to, message.bcc || ""].filter(Boolean),
    testHeader: message.headers?.get("x-engineerit-test") || null,
  });
  if (decision.deliver !== "smtp") {
    console.info("[mail-sink]", decision.reason, message.to, message.subject);
    if (decision.deliver === "mailpit") {
      const transport = nodemailer.createTransport({
        host: process.env.MAILPIT_HOST || "127.0.0.1",
        port: Number(process.env.MAILPIT_PORT || 1025),
        secure: false,
      });
      await transport.sendMail({
        from: fromHeader(message, process.env.MAIL_FROM || "noreply@engineerit.ai"),
        to: message.to,
        bcc: message.bcc,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
        headers: message.extraHeaders,
      });
      return { sent: true, sink: "mailpit" as const, reason: decision.reason };
    }
    return { sent: false, sink: "log" as const, reason: decision.reason };
  }

  const mailer = getMailer();
  if (!mailer) return { sent: false, sink: null, reason: "not-configured" };
  await mailer.transporter.sendMail({
    from: fromHeader(message, mailer.from),
    to: message.to,
    ...(message.bcc ? { bcc: message.bcc } : {}),
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments,
    headers: message.extraHeaders,
  });
  return { sent: true, sink: null, reason: "smtp" };
}

export function getMailer() {
  if (!isProductionMailRuntime()) return null;
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
