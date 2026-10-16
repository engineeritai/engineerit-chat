import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Enterprise invoices are closed. Enterprise is bought from pricing and renews through Moyasar." },
    { status: 410 }
  );
}
