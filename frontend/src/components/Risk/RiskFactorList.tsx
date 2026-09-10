"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { RiskFactor } from "@/lib/types";
import { NUM, PALETTE, bandTone } from "@/components/ui/tone";
import { EvidenceTrigger } from "@/components/Evidence/EvidenceTrigger";

export interface RiskFactorListProps {
  factors: RiskFactor[];
  /** The engine's score, or null when it produced none. See RiskGauge. */
  overallScore: number | null;
  band?: string;
  triggeredRules?: string[];
  missingInputs?: string[];
  dataQualityLabel?: string;
  confidence?: number;
  showTotalCheck?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const pts = (f: RiskFactor) => (typeof f.points === "number" ? f.points : Number(f.points_added) || 0);

export const RiskFactorList: React.FC<RiskFactorListProps> = ({
  factors = [],
  overallScore,
  band,
  triggeredRules = [],
  missingInputs = [],
  dataQualityLabel,
  confidence,
  showTotalCheck = true,
  className = "",
}) => {
  const tone = bandTone(band);
  const sum = factors.reduce((a, f) => a + pts(f), 0);
  // With no score there is nothing to reconcile the factor points against, so
  // the total check is withheld rather than reported as a mismatch against a
  // stand-in zero.
  const hasScore = typeof overallScore === "number";
  const verified = hasScore && sum === overallScore;
  // Bars are sized against the score (so the stack visibly fills to the score),
  // falling back to the sum when the score is 0 or absent, to avoid
  // divide-by-zero.
  const denom = Math.max(hasScore ? (overallScore as number) : 0, sum, 1);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#12384a] pb-1.5">
        <span className={`text-[10px] ${NUM} font-semibold uppercase tracking-wider text-[#7a94a3]`}>
          factor decomposition
        </span>
        <span className={`text-[10px] ${NUM} text-[#7a94a3]`}>{factors.length} factors</span>
      </div>

      {factors.length === 0 ? (
        <div className="text-[11px] text-[#7a94a3] italic">No factor breakdown provided for this assessment.</div>
      ) : (
        <>
          {/* Stacked composition bar: each factor is a segment of the score */}
          <div className="h-2 w-full flex overflow-hidden rounded-sm bg-[#12384a]" aria-hidden="true">
            {factors.map((f, i) => (
              <div
                key={i}
                title={`${f.label || f.name}: +${pts(f)}`}
                className="h-full border-r border-[#04141d] last:border-0"
                style={{ width: `${(Math.max(pts(f), 0) / denom) * 100}%`, background: tone.hex, opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>

          <ul className="space-y-2">
            {factors.map((f, i) => {
              const p = pts(f);
              const name = f.label || f.name;
              const val = f.raw_value != null ? `${f.raw_value} ${f.unit || ""}`.trim() : f.value;
              const rule = f.rule_fired || f.description;
              return (
                <li key={f.key || i} className="text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[12px] text-[#e8f4f8] truncate">{name}</span>
                      <EvidenceTrigger variableHint={name} iconOnly className="flex-shrink-0" />
                    </div>
                    <div className={`flex items-center gap-3 flex-shrink-0 ${NUM} text-[11.5px]`}>
                      {val && <span className="text-[#7a94a3]">{val}</span>}
                      <span className="font-semibold w-[52px] text-right" style={{ color: p > 0 ? tone.hex : p < 0 ? PALETTE.calm : PALETTE.muted }}>
                        {p > 0 ? `+${p}` : p} pts
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 h-1 w-full bg-[#12384a] rounded-sm overflow-hidden" aria-hidden="true">
                    <div className="h-full" style={{ width: `${(Math.max(p, 0) / denom) * 100}%`, background: tone.hex }} />
                  </div>
                  {rule && <div className="mt-0.5 text-[10.5px] text-[#7a94a3] leading-snug">{rule}</div>}
                </li>
              );
            })}
          </ul>

          {showTotalCheck && (
            <div
              className={`pt-2 border-t border-[#12384a] text-[11.5px] ${NUM} font-semibold`}
              style={{
                color: !hasScore
                  ? PALETTE.muted
                  : verified
                  ? PALETTE.calm
                  : PALETTE.severe,
              }}
              role="status"
            >
              {hasScore ? (
                <>
                  Σ {sum} {verified ? "=" : "≠"} score {overallScore}{" "}
                  {verified ? "✓" : "✗ MISMATCH"}
                </>
              ) : (
                <>Σ {sum} · no score to reconcile against</>
              )}
            </div>
          )}
        </>
      )}

      {triggeredRules.length > 0 && (
        <div className="pt-2 border-t border-[#12384a] space-y-1">
          <span className={`text-[10px] ${NUM} uppercase tracking-wider font-semibold`} style={{ color: PALETTE.caution }}>
            triggered rules ({triggeredRules.length})
          </span>
          {triggeredRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-[11.5px] text-[#e8f4f8]">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: PALETTE.caution }} />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      )}

      {missingInputs.length > 0 && (
        <div className={`flex items-start gap-1.5 text-[10.5px] text-[#7a94a3] ${NUM}`}>
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>missing inputs: {missingInputs.join(", ")}</span>
        </div>
      )}

      {(dataQualityLabel || typeof confidence === "number") && (
        <div className={`pt-1 text-[10.5px] ${NUM} text-[#7a94a3] flex flex-wrap gap-x-4 gap-y-0.5`}>
          {dataQualityLabel && <span>data_quality: <span className="text-[#e8f4f8]">{dataQualityLabel}</span></span>}
          {typeof confidence === "number" && <span>confidence: <span className="text-[#e8f4f8]">{confidence}%</span></span>}
        </div>
      )}
    </div>
  );
};
