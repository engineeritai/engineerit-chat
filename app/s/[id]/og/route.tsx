import { renderShareImage } from "@/lib/shareOg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return renderShareImage(id);
}
