import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { type, text, email } = await req.json();

    console.log("New feedback:", { type, text, email });

    // لاحقاً: يمكن ربطه بإرسال بريد فعلي إلى info@engineerit.ai
    // أو تخزينه في قاعدة بيانات.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return new NextResponse("Invalid request", { status: 400 });
  }
}
