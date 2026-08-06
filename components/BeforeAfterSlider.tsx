"use client";

import { useCallback, useRef, useState } from "react";

type BeforeAfterSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  alt: string;
};

/**
 * Konzept, Startseite: "Vorher-Nachher-Projekte mit Slider: Regler startet
 * mittig, Nutzer zieht nach links/rechts." Pointer events cover mouse and
 * touch; the range input underneath keeps it keyboard- and screen-reader
 * accessible.
 */
export function BeforeAfterSlider({ beforeSrc, afterSrc, alt }: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState(50);

  const updateFromClientX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setPosition(Math.min(100, Math.max(0, ratio * 100)));
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromClientX(event.clientX);
    },
    [updateFromClientX]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      updateFromClientX(event.clientX);
    },
    [updateFromClientX]
  );

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      className="group relative aspect-[4/3] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-4xl bg-creme"
    >
      {/* After = base layer */}
      <img src={afterSrc} alt={alt} draggable={false} className="absolute inset-0 h-full w-full object-cover" />

      {/* Before = clipped overlay */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        aria-hidden="true"
      >
        <img src={beforeSrc} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      </div>

      {/* Divider + handle */}
      <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${position}%` }} aria-hidden="true">
        <div className="absolute inset-y-0 -left-px w-[2px] bg-bone shadow-[0_0_12px_rgba(0,0,0,0.35)]" />
        <div className="absolute top-1/2 -left-[22px] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-bone shadow-lg">
          <span className="font-mono text-[12px] tracking-tight text-ink">&#8596;</span>
        </div>
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-ink/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-bone backdrop-blur-sm">
        Vorher
      </span>
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-laub-600/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-bone backdrop-blur-sm">
        Nachher
      </span>

      {/* Accessible fallback control */}
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(position)}
        onChange={(event) => setPosition(Number(event.target.value))}
        aria-label={`Vorher-Nachher-Vergleich: ${alt}`}
        className="absolute bottom-3 left-1/2 z-20 w-1/2 -translate-x-1/2 opacity-0 focus-visible:opacity-100"
      />
    </div>
  );
}
