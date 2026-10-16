import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Manual activation is closed. Plans renew through Moyasar." },
    { status: 410 }
  );
}
