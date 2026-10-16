import { NextResponse } from "next/server";
import { readApplePayDomainAssociation } from "@/lib/applePayDomain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body = await readApplePayDomainAssociation();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}
