import { RIYAL, RIYAL_PATHS, RIYAL_VIEWBOX, embedRiyal } from "@/lib/riyal";

/** Official mark drawn as SVG. The U+20C1 font glyph is a box on Windows. */
export function RiyalMark({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg
      className={className ? `riyal-mark ${className}` : "riyal-mark"}
      viewBox={`0 0 ${RIYAL_VIEWBOX.width} ${RIYAL_VIEWBOX.height}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "SAR"}
      aria-hidden={decorative ? true : undefined}
      data-riyal="svg"
    >
      {decorative ? null : <title>SAR</title>}
      {RIYAL_PATHS.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/** A plan feature. Amounts stay with the riyal sign. Moyasar stays left to right inside Arabic. */
export function FeatureLine({ children }: { children: string }) {
  const text = embedRiyal(children);
  const parts = text.split(/(\u20C1\s*[\d,]+(?:\.\d+)?|Moyasar)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part === "Moyasar") {
          return (
            <bdi key={index} dir="ltr">
              Moyasar
            </bdi>
          );
        }
        if (part.startsWith(RIYAL)) {
          return (
            <bdi key={index} dir="ltr" className="sar-amount">
              <RiyalMark />
              {part.slice(RIYAL.length)}
            </bdi>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
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
