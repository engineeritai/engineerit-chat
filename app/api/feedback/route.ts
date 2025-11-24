import { NextResponse } from "next/server";
import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, text, email } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is empty" },
        { status: 400 }
      );
    }

    // Email content
    const msg = {
      to: "info@engineerit.ai",
      from: "info@engineerit.ai", // MUST be verified in SendGrid
      subject: `Engineerit.ai – New ${type}`,
      text: `
New feedback / complaint / suggestion:

Type: ${type}
Email: ${email || "Not provided"}

Message:
${text}
      `,
    };

    await sendgrid.send(msg);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Feedback error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
