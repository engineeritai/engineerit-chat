import { handleAuthEmail } from "@/lib/authEmail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleAuthEmail(req, "reset");
}
