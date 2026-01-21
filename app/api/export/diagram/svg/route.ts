// app/api/export/diagram/svg/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  title?: string;
  content?: string; // ascii / code
  filename?: string;
};

function safeFilename(name: string) {
  return (
    name
      .trim()
      .replace(/[^\w\-(). ]+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "engineerit-diagram"
  );
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render text as SVG with monospace and preserved whitespace.
 * This keeps ASCII diagrams aligned on all devices.
 */
function textToSvg(text: string, title: string) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");

  // basic sizing heuristics
  const fontSize = 16; // px
  const lineHeight = 22; // px
  const paddingX = 24;
  const paddingY = 24;

  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);

  // Approx monospace width ~ 0.62 * fontSize
  const charW = Math.ceil(fontSize * 0.62);
  const width = Math.max(560, paddingX * 2 + longest * charW);
  const height = Math.max(260, paddingY * 2 + (lines.length + 3) * lineHeight);

  const safeTitle = escapeXml(title || "engineerit.ai diagram");

  const textBlock = lines
    .map((l, i) => {
      const safeLine = escapeXml(l);
      const y = paddingY + (i + 2) * lineHeight;
      return `<text x="${paddingX}" y="${y}" xml:space="preserve">${safeLine}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <style>
      .bg { fill: #ffffff; }
      .card { fill: #ffffff; stroke: #e5e7eb; stroke-width: 1.5; }
      .title { font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 16px; font-weight: 700; fill: #111827; }
      .brand { font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 12px; fill: #2563eb; }
      text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: ${fontSize}px; fill: #111827; }
    </style>
  </defs>

  <rect class="bg" x="0" y="0" width="${width}" height="${height}" />
  <rect class="card" x="16" y="16" width="${width - 32}" height="${height - 32}" rx="14" ry="14" />
  <text class="title" x="${paddingX}" y="${paddingY + lineHeight}">${safeTitle}</text>
  <text class="brand" x="${width - 140}" y="${paddingY + lineHeight}">engineerit.ai</text>

  ${textBlock}
</svg>`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ReqBody>;
    const content = (body.content || "").toString();
    if (!content.trim()) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const title = (body.title || "engineerit.ai diagram").toString();
    const svg = textToSvg(content, title);

    const requested = body.filename ? safeFilename(body.filename) : "engineerit-diagram";
    const outName = requested.toLowerCase().endsWith(".svg") ? requested : `${requested}.svg`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${outName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SVG diagram export failed", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
