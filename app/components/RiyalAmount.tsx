import { RIYAL, RIYAL_PATHS, RIYAL_VIEWBOX, embedRiyal } from "@/lib/riyal";

/** Official mark drawn as SVG. The U+20C1 font glyph is a box on Windows. */
export function RiyalMark() {
  return (
    <svg
      className="riyal-mark"
      viewBox={`0 0 ${RIYAL_VIEWBOX.width} ${RIYAL_VIEWBOX.height}`}
      role="img"
      aria-label="SAR"
      data-riyal="svg"
    >
      <title>SAR</title>
      {RIYAL_PATHS.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Renders a price string with the riyal sign kept on the left of the number. */
export function SarText({ children, className }: { children: string; className?: string }) {
  const text = embedRiyal(children);
  const parts = text.split(RIYAL);
  return (
    <span className={className ? `sar-amount ${className}` : "sar-amount"} dir="ltr">
      {parts.map((part, index) => (
        <span key={`${index}-${part}`}>
          {index > 0 ? <RiyalMark /> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
