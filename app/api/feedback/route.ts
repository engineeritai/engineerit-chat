import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { type, text, email } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // SMTP Transporter for Zoho
    const transporter = nodemailer.createTransport({
      host: process.env.ZSMTP_HOST,
      port: Number(process.env.ZSMTP_PORT || 465),
      secure: Number(process.env.ZSMTP_PORT) === 465, // true للبورت 465
      auth: {
        user: process.env.ZSMTP_USER,
        pass: process.env.ZSMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.ZSMTP_USER,         // info@engineerit.ai
      to: process.env.ZSMTP_USER,           // نفس الإيميل يستقبل
      subject: `EngineerIT - New ${type || "Feedback"}`,
      html: `
        <h2>New Message From engineerit.ai</h2>
        <p><strong>Category:</strong> ${type || "feedback"}</p>
        <p><strong>Email:</strong> ${email || "Not provided"}</p>
        <hr />
        <p>${text.replace(/\n/g, "<br>")}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("FEEDBACK ERROR:", err);
    return NextResponse.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    );
  }
}
