import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { type, text, email } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      host: process.env.ZSMTP_HOST,
      port: Number(process.env.ZSMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.ZSMTP_USER,
        pass: process.env.ZSMTP_PASS,
      },
    });

    // Build email content
    const mailOptions = {
      from: `"Engineerit Feedback" <${process.env.ZSMTP_USER}>`,
      to: process.env.ZSMTP_USER, // send to same inbox
      subject: `New ${type} received from engineerit.ai`,
      html: `
        <h2>New Feedback / Complaint / Suggestion</h2>
        <p><strong>Category:</strong> ${type}</p>
        <p><strong>Email:</strong> ${email || "Not provided"}</p>
        <p><strong>Message:</strong></p>
        <p>${text.replace(/\n/g, "<br>")}</p>
      `,
    };

    // Send email
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
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

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
      secure: Number(process.env.ZSMTP_PORT) === 465, // secure=true only for 465
      auth: {
        user: process.env.ZSMTP_USER,
        pass: process.env.ZSMTP_PASS,
      },
    });

    // Build email contents
    const mailOptions = {
      from: process.env.ZSMTP_USER,
      to: process.env.ZSMTP_USER,
      subject: `EngineerIT - New ${type || "Feedback"}`,
      html: `
        <h2>New Message From engineerit.ai</h2>
        <p><strong>Category:</strong> ${type || "feedback"}</p>
        <p><strong>Email:</strong> ${email || "Not provided"}</p>
        <hr />
        <p>${text.replace(/\n/g, "<br>")}</p>
      `,
    };

    // Send email
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
