import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { plan } = await req.json();

  return NextResponse.json({
    success: true,
    selected: plan,
    message: "Plan saved temporarily. Payment not active yet.",
  });
}
