import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// مهم جداً: نجبر الراوت يشتغل على Node.js (ليس Edge)
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body.type || "feedback";
    const text = body.text as string | undefined;
    const email = body.email as string | undefined;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const host = process.env.ZSMTP_HOST;
    const port = Number(process.env.ZSMTP_PORT || "465");
    const user = process.env.ZSMTP_USER;
    const pass = process.env.ZSMTP_PASS;

    if (!host || !user || !pass) {
      console.error("Missing SMTP envs", {
        host: !!host,
        user: !!user,
        pass: !!pass,
      });
      return NextResponse.json(
        { error: "Email server is not configured" },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const safeText = text.toString();

    await transporter.sendMail({
      from: `"engineerit.ai Feedback" <${user}>`,
      to: user, // ترسل لنفس الإيميل info@engineerit.ai
      subject: `New ${type} from engineerit.ai`,
      html: `
        <h2>New feedback message</h2>
        <p><strong>Category:</strong> ${type}</p>
        <p><strong>From email:</strong> ${email || "Not provided"}</p>
        <p><strong>Message:</strong></p>
        <p>${safeText.replace(/\n/g, "<br>")}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("FEEDBACK ERROR:", err);
    return NextResponse.json(
      { error: "Failed to send feedback" },
      { status: 500 },
    );
  }
}
