"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, Scale, Info, AlertCircle } from "lucide-react";
import { RiskFactor } from "@/lib/types";

export interface RiskFactorListProps {
  factors: RiskFactor[];
  overallScore: number;
  triggeredRules?: string[];
  missingInputs?: string[];
  dataQualityLabel?: string;
  showTotalCheck?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export const RiskFactorList: React.FC<RiskFactorListProps> = ({
  factors = [],
  overallScore,
  triggeredRules = [],
  missingInputs = [],
  dataQualityLabel,
  showTotalCheck = true,
  defaultExpanded = false,
  className = "",
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(defaultExpanded);
  const [expandedFactorIdx, setExpandedFactorIdx] = useState<number | null>(null);

  if (!factors || factors.length === 0) {
    return (
      <div className={`p-3 rounded-lg bg-white/[0.02] border border-orca-border/50 text-[11px] text-orca-muted ${className}`}>
        No individual risk factor breakdown provided for this assessment.
      </div>
    );
  }

  // Calculate factor point sum for total consistency check
  const pointsSum = factors.reduce((acc, factor) => {
    const pts = typeof factor.points === "number" ? factor.points : factor.points_added ?? 0;
    return acc + pts;
  }, 0);

  const isCompositionVerified = pointsSum === overallScore;

  // Find maximum factor points for relative contribution bar normalization
  const maxFactorPoints = Math.max(...factors.map((f) => Math.abs(typeof f.points === "number" ? f.points : f.points_added ?? 0)), 1);

  const toggleFactorExpand = (idx: number) => {
    setExpandedFactorIdx(expandedFactorIdx === idx ? null : idx);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with Title + [View factor details] Toggle */}
      <div className="flex items-center justify-between border-b border-orca-border/50 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300">
            Factor Decomposition
          </span>
          <span className="text-[10px] text-orca-dim font-mono">({factors.length} factors)</span>
        </div>

        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          aria-expanded={isDetailsOpen}
          className="flex items-center gap-1 text-[11px] font-mono text-orca-cyan hover:text-white transition focus:outline-none focus:ring-1 focus:ring-orca-cyan px-1.5 py-0.5 rounded"
        >
          <span>{isDetailsOpen ? "Collapse details" : "View factor details"}</span>
          {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Factor Breakdown List */}
      <div className="space-y-2">
        {factors.map((factor, idx) => {
          const factorName = factor.label || factor.name;
          const rawVal = factor.raw_value ? `${factor.raw_value} ${factor.unit || ""}`.trim() : factor.value;
          const points = typeof factor.points === "number" ? factor.points : factor.points_added ?? 0;
          const ruleText = factor.rule_fired || factor.description;
          const isItemExpanded = expandedFactorIdx === idx;

          // Normalized width based on points relative to max factor points (never invented score)
          const barPct = Math.min(100, Math.max(8, (points / maxFactorPoints) * 100));

          return (
            <div
              key={factor.key || idx}
              className="p-2 rounded-lg bg-orca-darkest/50 border border-orca-border/60 hover:border-orca-cyan/30 transition-all text-xs space-y-1.5"
            >
              {/* Factor Title + Points */}
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-slate-200 text-[12px] truncate">{factorName}</span>
                  {factor.weight !== undefined && (
                    <span className="text-[10px] font-mono text-orca-dim flex-shrink-0">
                      (w: {typeof factor.weight === "number" ? factor.weight.toFixed(2) : factor.weight})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11.5px]">
                  {rawVal && <span className="text-slate-400">{rawVal}</span>}
                  <span
                    className={`font-semibold ${
                      points > 0 ? "text-amber-400" : points < 0 ? "text-emerald-400" : "text-orca-muted"
                    }`}
                  >
                    {points > 0 ? `+${points}` : points} pts
                  </span>
                </div>
              </div>

              {/* Contribution Bar (Subtle and Technical) */}
              <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    points >= 20 ? "bg-amber-400" : points > 0 ? "bg-amber-400/80" : "bg-emerald-400"
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>

              {/* Expandable Rule Trigger Explanation */}
              {ruleText && (
                <div className="pt-0.5">
                  {isDetailsOpen || isItemExpanded ? (
                    <div className="p-1.5 rounded bg-orca-dark/80 border border-orca-border/50 text-[10.5px] text-slate-300 font-sans flex items-start gap-1.5 mt-1">
                      <AlertCircle className="w-3 h-3 text-orca-cyan mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-orca-muted font-mono text-[10px] uppercase block">Rule applied:</span>
                        <span>{ruleText}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleFactorExpand(idx)}
                      className="text-[10px] font-mono text-orca-dim hover:text-orca-cyan transition flex items-center gap-1"
                    >
                      <span>Show rule</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Triggered Threshold Rules (if any) */}
      {triggeredRules.length > 0 && (
        <div className="pt-2 border-t border-orca-border/50 space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 block font-semibold">
            Triggered Threshold Rules ({triggeredRules.length})
          </span>
          <div className="space-y-1">
            {triggeredRules.map((rule, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded bg-amber-950/20 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-200/90"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Inputs Warning (Missing inputs raise score / lower confidence) */}
      {missingInputs.length > 0 && (
        <div className="p-2 rounded bg-white/[0.02] border border-white/[0.08] text-[10.5px] text-orca-muted space-y-0.5 font-mono">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Info className="w-3 h-3 text-orca-muted" />
            <span>Missing Observations ({missingInputs.join(", ")})</span>
          </div>
          <p className="text-orca-dim text-[10px] font-sans">
            Feeds were imputed at baseline mean; partial coverage reduces confidence.
          </p>
        </div>
      )}

      {/* Total Consistency Check Strip */}
      {showTotalCheck && (
        <div className="pt-2 border-t border-orca-border/50 flex items-center justify-between text-[10.5px] font-mono text-orca-muted">
          <div className="flex items-center gap-1.5">
            <Scale className="w-3 h-3 text-orca-dim" />
            <span>Factor Total: {pointsSum} pts</span>
          </div>

          {isCompositionVerified ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Score composition verified</span>
            </span>
          ) : (
            <span className="text-amber-400/90 text-[10px]">
              Note: Factor sum ({pointsSum} pts) vs score ({overallScore})
            </span>
          )}
        </div>
      )}

      {/* Data Quality Statement */}
      {dataQualityLabel && (
        <div className="text-[10px] font-mono text-orca-dim pt-0.5">
          Source: {dataQualityLabel}
        </div>
      )}
    </div>
  );
};
