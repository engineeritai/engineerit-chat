import { NextResponse } from "next/server";
import { shareRecordTitle } from "@/lib/messageDocument";
import { createShare } from "@/lib/shareStore";
import { publicShareUrl } from "@/lib/shareUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string; markdown?: string; content?: string; locale?: string };
    const markdown = (body.markdown ?? body.content ?? "").toString();
    if (!markdown.trim()) return NextResponse.json({ error: "Missing content." }, { status: 400 });
    const locale = body.locale === "ar" || /[\u0600-\u06FF]/.test(markdown) ? "ar" : "en";
    const record = await createShare({
      title: shareRecordTitle(body.title, markdown, locale),
      markdown,
      locale,
    });
    const origin = new URL(req.url).origin;
    return NextResponse.json({ id: record.id, url: publicShareUrl(record.id, origin) });
  } catch (err) {
    console.error("share create failed", err);
    return NextResponse.json({ error: "Could not create the share page." }, { status: 500 });
  }
}
