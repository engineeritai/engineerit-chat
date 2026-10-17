import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readShare } from "@/lib/shareStore";

export const runtime = "nodejs";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const share = await readShare(id);
  const title = share?.title || "engineer it";
  const rtl = share?.locale === "ar";
  const font = await readFile(path.join(process.cwd(), rtl ? "assets/fonts/NotoSansArabic-Regular.ttf" : "assets/fonts/Inter-SemiBold.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f8fafc",
          padding: "64px",
          fontFamily: "Brand",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#1a56ff" }}>engineer it</div>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.15, color: "#0f172a", direction: rtl ? "rtl" : "ltr" }}>{title}</div>
        <div style={{ display: "flex", fontSize: 24, color: "#64748b" }}>engineerit.ai</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Brand", data: font, weight: 600, style: "normal" }],
    }
  );
}
