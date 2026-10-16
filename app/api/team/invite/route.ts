import { NextResponse } from "next/server";
import crypto from "crypto";
import { teamGrantsAccess } from "@/lib/effectivePlan";
import { appBaseUrl, escapeHtml, getMailer } from "@/lib/mail";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const email = normalizeEmail(body?.email);
    if (!isEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (email === (user.email || "").trim().toLowerCase()) {
      return NextResponse.json(
        { error: "You are already the team owner." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id, name, seat_limit, status, current_period_end, plan")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (teamErr) {
      return NextResponse.json({ error: teamErr.message }, { status: 500 });
    }
    if (!team) {
      return NextResponse.json(
        { error: "Only the team owner can invite colleagues." },
        { status: 403 }
      );
    }
    if (!teamGrantsAccess(team)) {
      return NextResponse.json(
        { error: "This subscription is not active, so new invites are paused." },
        { status: 403 }
      );
    }

    const { data: existing, error: existingErr } = await admin
      .from("team_members")
      .select("id, status")
      .eq("team_id", team.id)
      .eq("email", email)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }
    if (existing?.status === "active") {
      return NextResponse.json({ error: "That person is already on the team." }, { status: 409 });
    }

    const { count, error: countErr } = await admin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .in("status", ["active", "invited"]);

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    const needsSeat = !existing || existing.status === "removed";
    if (needsSeat && (count || 0) >= Number(team.seat_limit)) {
      return NextResponse.json(
        { error: "No seats left. Add an extra seat from Pricing, or remove a member." },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    if (existing?.id) {
      const { error } = await admin
        .from("team_members")
        .update({
          status: "invited",
          role: "member",
          invite_token: token,
          invite_expires_at: expires,
          invited_at: nowIso,
          user_id: null,
          accepted_at: null,
        })
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin.from("team_members").insert({
        team_id: team.id,
        email,
        role: "member",
        status: "invited",
        invite_token: token,
        invite_expires_at: expires,
        invited_at: nowIso,
        created_at: nowIso,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mailer = getMailer();
    if (!mailer) {
      return NextResponse.json(
        { error: "Email server is not configured." },
        { status: 500 }
      );
    }

    const link = `${appBaseUrl(req)}/team/join?token=${encodeURIComponent(token)}`;
    const teamName = escapeHtml(String(team.name || "Team"));

    await mailer.transporter.sendMail({
      from: `"engineerit.ai" <${mailer.from}>`,
      to: email,
      subject: "You are invited to a team on engineerit.ai",
      html: `
        <p>You have been invited to the <strong>${teamName}</strong> team on engineerit.ai.</p>
        <p>Sign up or sign in with <strong>${escapeHtml(email)}</strong>, then open this link to join:</p>
        <p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
        <p>The seat includes Consultant-tier access while the team subscription is active.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/team/invite", err);
    return NextResponse.json({ error: "Could not send the invite." }, { status: 500 });
  }
}
