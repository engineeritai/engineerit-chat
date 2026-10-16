import { NextResponse } from "next/server";
import { escapeHtml, getMailer } from "@/lib/mail";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          name?: string;
          company?: string;
          email?: string;
          phone?: string;
          seats?: number;
        }
      | null;

    const name = text(body?.name, 200);
    const company = text(body?.company, 200);
    const email = text(body?.email, 200).toLowerCase();
    const phone = text(body?.phone, 40);
    const seats = Math.floor(Number(body?.seats));

    if (!name || !company || !email || !phone) {
      return NextResponse.json(
        { error: "Name, company, email, and phone are required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!Number.isFinite(seats) || seats < 1 || seats > 100000) {
      return NextResponse.json({ error: "Enter the number of seats you need." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("enterprise_leads")
      .insert({ name, company, email, phone, seats })
      .select("id")
      .single();

    if (error || !data) {
      console.error("enterprise lead insert", error);
      return NextResponse.json({ error: "Could not store the request." }, { status: 500 });
    }

    const mailer = getMailer();
    if (!mailer) {
      return NextResponse.json(
        { error: "Request stored, but email is not configured.", stored: true, id: data.id },
        { status: 502 }
      );
    }

    try {
      await mailer.transporter.sendMail({
        from: `"engineerit.ai Sales" <${mailer.from}>`,
        to: mailer.salesTo,
        replyTo: email,
        subject: `Enterprise inquiry from ${company}`,
        html: `
          <h2>Enterprise contact sales</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Company:</strong> ${escapeHtml(company)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Seats:</strong> ${seats}</p>
          <p>Create a Moyasar payment link for this lead from the admin subscriptions page. Access starts after Moyasar confirms payment.</p>
        `,
      });
    } catch (mailErr) {
      console.error("enterprise lead email", mailErr);
      return NextResponse.json(
        { error: "Request stored, but the email could not be sent.", stored: true, id: data.id },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("POST /api/enterprise/lead", err);
    return NextResponse.json({ error: "Could not submit the request." }, { status: 500 });
  }
}
