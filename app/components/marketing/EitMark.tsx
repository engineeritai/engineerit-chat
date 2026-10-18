import { EIT_PATH, EIT_VIEWBOX } from "@/app/components/marketing/eitPath";
import { eitPlateMarkSize } from "@/lib/eitPlateSize";

const [, , vbW, vbH] = EIT_VIEWBOX.split(" ").map(Number);

/** Solid e, outlined it, solid i-dot. No bubble or sparkle. */
export default function EitMark({
  size = 72,
  title,
  tone = "brand",
  plate,
}: {
  size?: number;
  title?: string;
  tone?: "brand" | "inverse";
  /** White circle behind the blue mark. Used for the assistant avatar. */
  plate?: "circle";
}) {
  const plated = plate === "circle" ? eitPlateMarkSize(size, vbW, vbH) : null;
  const height = plated ? plated.height : size;
  const width = plated ? plated.width : Math.round((size * vbW) / vbH);
  const svg = (
    <svg
      className="eit-mark"
      width={width}
      height={height}
      viewBox={EIT_VIEWBOX}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill={tone === "inverse" ? "#ffffff" : "#0d60e4"}
      fillRule="evenodd"
    >
      {title ? <title>{title}</title> : null}
      <path d={EIT_PATH} />
    </svg>
  );
  if (plate !== "circle") return svg;
  return (
    <span className="eit-plate" style={{ width: size, height: size }}>
      {svg}
    </span>
  );
}
