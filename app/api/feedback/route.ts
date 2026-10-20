import { NextResponse } from "next/server";
import { deliverMail, escapeHtml } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = (body.type as string | undefined) || "feedback";
    const email = body.email as string | undefined;
    const message = (body.text as string | undefined) || (body.message as string | undefined);

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const toEmail = process.env.FEEDBACK_TO_EMAIL?.trim() || process.env.ZSMTP_USER || "support@engineerit.ai";
    const mailed = await deliverMail({
      to: toEmail,
      fromName: "engineerit.ai Feedback",
      replyTo: email,
      subject: `New ${type} from engineerit.ai`,
      headers: req.headers,
      html: `
        <h2>New feedback message</h2>
        <p><strong>Category:</strong> ${escapeHtml(type)}</p>
        <p><strong>From email:</strong> ${escapeHtml(email || "Not provided")}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      `,
    });
    if (mailed.reason === "not-configured") {
      return NextResponse.json({ error: "Email server is not configured" }, { status: 500 });
    }
    return NextResponse.json({ success: true, sent: mailed.sent });
  } catch (err) {
    console.error("FEEDBACK ERROR:", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}
