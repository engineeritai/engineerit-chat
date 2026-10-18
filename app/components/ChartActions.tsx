"use client";

type Labels = { enlarge: string; copy: string; png: string; svg: string };

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ChartActions({
  labels,
  onEnlarge,
  onCopy,
  onPng,
  onSvg,
}: {
  labels: Labels;
  onEnlarge: () => void;
  onCopy: () => void;
  onPng: () => void;
  onSvg: () => void;
}) {
  const short = (value: string) => value.replace(/^Download\s+|^تنزيل\s+/i, "");
  return (
    <div className="diagram-tools">
      <button type="button" className="chart-action" onClick={onEnlarge} aria-label={labels.enlarge} title={labels.enlarge}>
        <Icon d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        <span>{labels.enlarge}</span>
      </button>
      <button type="button" className="chart-action" onClick={onCopy} aria-label={labels.copy} title={labels.copy}>
        <Icon d="M8 8h11v11H8zM5 16V5h11" />
        <span>{short(labels.copy).replace(" as image", "").replace(" كصورة", "")}</span>
      </button>
      <button type="button" className="chart-action" onClick={onPng} aria-label={labels.png} title={labels.png}>
        <Icon d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
        <span>{short(labels.png)}</span>
      </button>
      <button type="button" className="chart-action" onClick={onSvg} aria-label={labels.svg} title={labels.svg}>
        <Icon d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
        <span>{short(labels.svg)}</span>
      </button>
    </div>
  );
}
