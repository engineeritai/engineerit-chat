import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Enterprise is self-serve on the pricing page." },
    { status: 410 }
  );
}
