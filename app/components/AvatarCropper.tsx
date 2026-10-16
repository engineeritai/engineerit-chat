"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  title: string;
  applyLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
};

/** Square crop. Drag to position, slider to zoom. Output is a 512px JPEG. */
export default function AvatarCropper({ src, title, applyLabel, cancelLabel, onCancel, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
    };
    image.src = src;
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#e8eaee";
    ctx.fillRect(0, 0, size, size);
    const base = Math.max(size / image.width, size / image.height) * zoom;
    const w = image.width * base;
    const h = image.height * base;
    const x = (size - w) / 2 + offset.x;
    const y = (size - h) / 2 + offset.y;
    ctx.drawImage(image, x, y, w, h);
  }, [zoom, offset, ready]);

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (event.clientX - drag.current.x),
      y: drag.current.oy + (event.clientY - drag.current.y),
    });
  }

  function pointerUp() {
    drag.current = null;
  }

  function apply() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onApply(blob);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="crop-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="crop-sheet">
        <h2>{title}</h2>
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="crop-canvas"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        />
        <label className="crop-zoom">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <div className="crop-actions">
          <button type="button" className="mkt-btn mkt-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="mkt-btn mkt-btn-primary" onClick={apply}>
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
