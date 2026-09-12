"use client";

/**
 * The thinking state: small fish swimming slowly in a circle. SVG and CSS
 * only; two rings rotate on transform and each fish wiggles a few degrees.
 * Under prefers-reduced-motion everything holds still (globals.css).
 */
import { useT } from "@/lib/i18n";

function Fish({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <g className="fish-body">
        <path d="M-9 0c3-4 9-4 14 0-5 4-11 4-14 0z" fill={color} />
        <path d="M-9 0l-5-4v8z" fill={color} opacity="0.8" />
        <circle cx="1.5" cy="-1" r="0.9" fill="var(--bg)" />
      </g>
    </g>
  );
}

export function FishRing({ size = 160 }: { size?: number }) {
  const t = useT();
  const outer = [0, 72, 144, 216, 288];
  const inner = [30, 150, 270];
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label={t("fish.label")}>
      <circle cx="80" cy="80" r="70" fill="none" stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx="80" cy="80" r="40" fill="none" stroke="var(--hairline-2)" strokeWidth="1" />
      <g className="fish-ring">
        {outer.map((a) => {
          const rad = (a * Math.PI) / 180;
          return <Fish key={a} x={80 + 70 * Math.cos(rad)} y={80 + 70 * Math.sin(rad)} r={a + 90} color="var(--accent)" />;
        })}
      </g>
      <g className="fish-ring-2">
        {inner.map((a) => {
          const rad = (a * Math.PI) / 180;
          return <Fish key={a} x={80 + 40 * Math.cos(rad)} y={80 + 40 * Math.sin(rad)} r={a - 90} color="var(--text-3)" />;
        })}
      </g>
    </svg>
  );
}

export function Thinking() {
  const t = useT();
  return (
    <div className="flex items-center gap-5" role="status" aria-live="polite">
      <FishRing size={120} />
      <div>
        <div className="font-semibold">{t("ai.thinking")}</div>
        <div className="mt-1 text-sm text-text-2">{t("ai.thinkingNote")}</div>
      </div>
    </div>
  );
}
