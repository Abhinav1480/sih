"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, AlertTriangle, AlertOctagon, ShieldAlert, HelpCircle } from "lucide-react";
import { RiskCategory } from "@/lib/types";
import { NUM, PALETTE, bandTone, verdictTone } from "@/components/ui/tone";
import { EvidenceTrigger } from "@/components/Evidence/EvidenceTrigger";

export interface RiskGaugeProps {
  /**
   * The score the deterministic engine computed, or null when it computed
   * none. Null is a real state: RouteAnalysisCard passes it because P0-7
   * stopped that card inventing a corridor score.
   */
  score: number | null | undefined;
  band: RiskCategory | string;
  verdict?: "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE" | string;
  label?: string;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
  showTrack?: boolean;
  className?: string;
}

const ICONS: Record<string, React.ElementType> = {
  LOW: ShieldCheck,
  MODERATE: AlertTriangle,
  HIGH: AlertOctagon,
  SEVERE: ShieldAlert,
};

// 240° arc, opening at the bottom.
const R = 44;
const SWEEP = 240;
const START = 150; // degrees, clockwise from +x axis (SVG y-down)
const polar = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: 60 + R * Math.cos(a), y: 60 + R * Math.sin(a) };
};
const arcPath = (fromDeg: number, toDeg: number) => {
  const s = polar(fromDeg);
  const e = polar(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};
const TRACK = arcPath(START, START + SWEEP);
const ARC_LEN = (SWEEP / 360) * 2 * Math.PI * R;

/** Animate 0 → target once per distinct target; never replays on re-render. */
function useOnceAnimated(target: number, ms = 700) {
  const [v, setV] = useState(0);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (seen.current === target) return;
    seen.current = target;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  band,
  verdict,
  label = "MARINE RISK",
  compact = false,
  className = "",
}) => {
  const normBand = (band || "").toUpperCase();
  const tone = bandTone(normBand);
  const Icon = ICONS[normBand] || HelpCircle;
  // `Math.round(Number(score) || 0)` used to sit here, so a null score -- the
  // very thing P0-7 taught RouteAnalysisCard to pass -- was announced on the
  // ARIA meter below as "score 0 out of 100": the safest possible reading of a
  // value the engine never produced. A score ORCA did not compute is not shown.
  const clamped =
    typeof score === "number" && Number.isFinite(score)
      ? Math.min(100, Math.max(0, Math.round(score)))
      : null;
  const animated = useOnceAnimated(clamped ?? 0);
  const vt = verdict ? verdictTone(verdict) : null;

  // With no score there is nothing to meter: role="meter" without a real
  // aria-valuenow would have a screen reader read out a number ORCA never
  // produced, so the element degrades to a plain labelled status instead.
  const meter =
    clamped === null
      ? {
          role: "status" as const,
          "aria-label": `${label}: ${tone.word}, score unavailable`,
        }
      : {
          role: "meter" as const,
          "aria-label": `${label}: ${tone.word} (${clamped}/100)`,
          "aria-valuenow": clamped,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuetext": `${tone.word} risk, score ${clamped} out of 100`,
        };

  /** The band still reads; only the number is withheld. */
  const scoreText = clamped === null ? "score unavailable" : `${clamped}/100`;

  if (compact) {
    return (
      <div {...meter} className={`flex items-center gap-2 ${className}`}>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] ${NUM} font-semibold`}
          style={{ color: tone.hex, borderColor: tone.hex }}
        >
          <Icon className="w-3 h-3 flex-shrink-0" />
          {tone.word} · {scoreText}
        </span>
        {vt && (
          <span className={`px-2 py-0.5 rounded border text-[10.5px] ${NUM} font-semibold`} style={{ color: vt.hex, borderColor: vt.hex }}>
            {vt.word}
          </span>
        )}
      </div>
    );
  }

  return (
    <div {...meter} className={`flex items-center gap-4 ${className}`}>
      {/* SVG arc gauge */}
      <svg viewBox="0 0 120 120" className="w-[124px] h-[124px] flex-shrink-0" aria-hidden="true">
        <path d={TRACK} fill="none" stroke={PALETTE.raised} strokeWidth="9" strokeLinecap="butt" />
        <path
          d={TRACK}
          fill="none"
          stroke={tone.hex}
          strokeWidth="9"
          strokeLinecap="butt"
          strokeDasharray={`${clamped === null ? 0 : (animated / 100) * ARC_LEN} ${ARC_LEN}`}
        />
        {/* band boundaries at 30 / 55 / 75 */}
        {[30, 55, 75].map((b) => {
          const d = START + (b / 100) * SWEEP;
          const p1 = polar(d);
          const a = (d * Math.PI) / 180;
          const p2 = { x: 60 + (R + 7) * Math.cos(a), y: 60 + (R + 7) * Math.sin(a) };
          return <line key={b} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={PALETTE.base} strokeWidth="1.5" />;
        })}
        <text x="60" y="58" textAnchor="middle" fill={PALETTE.text} fontSize="28" fontWeight="700" fontFamily="JetBrains Mono, ui-monospace, monospace">
          {clamped === null ? "—" : Math.round(animated)}
        </text>
        <text x="60" y="74" textAnchor="middle" fill={PALETTE.muted} fontSize="9" fontFamily="JetBrains Mono, ui-monospace, monospace">
          / 100
        </text>
      </svg>

      <div className="min-w-0 space-y-1.5">
        <div className={`text-[10px] ${NUM} font-semibold uppercase tracking-wider text-[#7a94a3]`}>{label}</div>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 flex-shrink-0" style={{ color: tone.hex }} />
          <span className="font-display text-[26px] font-bold tracking-tight leading-none" style={{ color: tone.hex }}>
            {tone.word}
          </span>
        </div>
        <div className={`text-[12px] ${NUM} text-[#e8f4f8] flex items-center gap-2`}>
          <span>
            {tone.word} · {scoreText}
          </span>
          <EvidenceTrigger kind="calc" label="Σ how" />
        </div>
        {vt && (
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${NUM} text-[#7a94a3] uppercase`}>verdict</span>
            <span
              className={`px-1.5 py-px rounded border text-[11px] ${NUM} font-bold tracking-wide`}
              style={{ color: vt.hex, borderColor: vt.hex }}
            >
              {vt.word}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
