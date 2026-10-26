import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { shareLanguage } from "@/lib/shareDirection";
import { readShare } from "@/lib/shareStore";

export async function renderShareImage(id: string) {
  const share = await readShare(id);
  const title = share?.title || "engineer it";
  const rtl = shareLanguage(`${title}\n${share?.markdown || ""}`, share?.locale === "ar" ? "ar" : "en") === "ar";
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
        <div
          style={{
            display: "flex",
            fontSize: 64,
            lineHeight: 1.15,
            color: "#0f172a",
            direction: rtl ? "rtl" : "ltr",
            textAlign: rtl ? "right" : "left",
            width: "100%",
          }}
        >
          {title}
        </div>
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
