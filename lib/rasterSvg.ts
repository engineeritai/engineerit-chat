import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const fontDir = path.join(process.cwd(), "assets/fonts");

export function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Rasterize an SVG to a wide PNG (about 300 dpi at an 11 inch slide). */
export function svgToPng(svg: string, width = 3300): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: [
        path.join(fontDir, "Inter-Regular.ttf"),
        path.join(fontDir, "Inter-SemiBold.ttf"),
        path.join(fontDir, "NotoSansArabic-Regular.ttf"),
      ],
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
  });
  return resvg.render().asPng();
}
