"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, AlertOctagon, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { RiskCategory } from "@/lib/types";

export interface RiskGaugeProps {
  score: number;
  band: RiskCategory;
  verdict?: "GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE" | string;
  label?: string;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
  showTrack?: boolean;
  className?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  band,
  verdict,
  label = "MARINE RISK",
  size = "md",
  compact = false,
  showTrack = true,
  className = "",
}) => {
  const normBand = (band || "LOW").toUpperCase() as RiskCategory;
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Authoritative FE-01 Risk Palette & Typography Config
  const bandConfig = {
    LOW: {
      label: "LOW",
      icon: ShieldCheck,
      color: "text-emerald-400",
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
      trackColor: "bg-emerald-500",
      glow: "shadow-[0_0_12px_rgba(16,185,129,0.2)]",
      desc: "Safe for routine maritime passage",
    },
    MODERATE: {
      label: "MODERATE",
      icon: AlertTriangle,
      color: "text-amber-400",
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      trackColor: "bg-amber-500",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
      desc: "Marginal sea conditions; caution advised",
    },
    HIGH: {
      label: "HIGH",
      icon: AlertOctagon,
      color: "text-orange-400",
      border: "border-orange-500/40",
      bg: "bg-orange-500/10",
      trackColor: "bg-orange-500",
      glow: "shadow-[0_0_12px_rgba(249,115,22,0.2)]",
      desc: "Elevated hazard; small-craft restriction",
    },
    SEVERE: {
      label: "SEVERE",
      icon: ShieldAlert,
      color: "text-rose-400",
      border: "border-rose-500/40",
      bg: "bg-rose-500/10",
      trackColor: "bg-rose-500",
      glow: "shadow-[0_0_12px_rgba(239,68,68,0.25)]",
      desc: "Critical hazards active; no-go advisory",
    },
  }[normBand] || {
    label: "LOW",
    icon: ShieldCheck,
    color: "text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    trackColor: "bg-emerald-500",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    desc: "Safe for standard operations",
  };

  const Icon = bandConfig.icon;

  // Verdict Styling
  const getVerdictBadge = (v: string) => {
    const vUpper = v.toUpperCase();
    if (vUpper === "GO") {
      return {
        text: "GO",
        icon: CheckCircle2,
        class: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
      };
    }
    if (vUpper === "CAUTION") {
      return {
        text: "CAUTION",
        icon: AlertTriangle,
        class: "bg-amber-500/15 text-amber-300 border-amber-500/35",
      };
    }
    if (vUpper === "NO_GO" || vUpper === "NO-GO") {
      return {
        text: "NO-GO",
        icon: XCircle,
        class: "bg-rose-500/15 text-rose-300 border-rose-500/35",
      };
    }
    return {
      text: vUpper,
      icon: ShieldCheck,
      class: "bg-white/[0.05] text-slate-300 border-white/[0.12]",
    };
  };

  const verdictBadge = verdict ? getVerdictBadge(verdict) : null;

  // Segment widths based on authoritative thresholds:
  // LOW (0–29): 30% | MODERATE (30–54): 25% | HIGH (55–74): 20% | SEVERE (75–100): 25%
  const segments = [
    { key: "LOW", label: "0-29", width: "30%", color: "bg-emerald-500/30", activeColor: "bg-emerald-400" },
    { key: "MODERATE", label: "30-54", width: "25%", color: "bg-amber-500/30", activeColor: "bg-amber-400" },
    { key: "HIGH", label: "55-74", width: "20%", color: "bg-orange-500/30", activeColor: "bg-orange-400" },
    { key: "SEVERE", label: "75-100", width: "25%", color: "bg-rose-500/30", activeColor: "bg-rose-400" },
  ];

  if (compact) {
    return (
      <div
        role="meter"
        aria-label={`${label}: ${normBand} (${clampedScore}/100)`}
        aria-valuenow={clampedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${normBand} risk, score ${clampedScore} out of 100`}
        className={`flex items-center gap-2.5 ${className}`}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono font-semibold ${bandConfig.bg} ${bandConfig.border} ${bandConfig.color}`}
        >
          <Icon className="w-3 h-3 flex-shrink-0" />
          <span>{bandConfig.label}</span>
          <span className="opacity-40">·</span>
          <span>{clampedScore}</span>
        </span>
        {verdictBadge && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-mono font-semibold ${verdictBadge.class}`}
          >
            {verdictBadge.text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      role="meter"
      aria-label={`${label}: ${normBand} (${clampedScore}/100)`}
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${normBand} risk, score ${clampedScore} out of 100`}
      className={`space-y-2.5 ${className}`}
    >
      {/* Top Header: Label + Monospace Score + Verdict */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-orca-muted">
            {label}
          </span>
          {verdictBadge && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] font-mono font-bold tracking-wide ${verdictBadge.class}`}
            >
              <verdictBadge.icon className="w-2.5 h-2.5" />
              VERDICT: {verdictBadge.text}
            </span>
          )}
        </div>

        <div className="font-mono text-xs text-slate-300">
          <span className="text-base font-bold text-white tracking-tight">{clampedScore}</span>
          <span className="text-orca-muted text-[11px]"> / 100</span>
        </div>
      </div>

      {/* Dominant Band Display */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border ${bandConfig.border} ${bandConfig.bg} ${bandConfig.color} ${bandConfig.glow}`}
          >
            <Icon className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <span className={`font-display text-xl font-bold tracking-tight ${bandConfig.color}`}>
              {bandConfig.label}
            </span>
            <span className="block text-[11px] text-orca-muted leading-none mt-0.5">
              {bandConfig.desc}
            </span>
          </div>
        </div>
      </div>

      {/* Calibrated Segmented Track Gauge */}
      {showTrack && (
        <div className="space-y-1 pt-0.5">
          <div className="relative h-2 rounded-full overflow-hidden bg-white/[0.04] border border-orca-border/80 flex gap-[2px] p-[1px]">
            {segments.map((seg) => {
              const isCurrentBand = normBand === seg.key;
              return (
                <div
                  key={seg.key}
                  style={{ width: seg.width }}
                  className={`h-full rounded-sm transition-colors duration-300 ${
                    isCurrentBand ? `${seg.activeColor} shadow-sm` : seg.color
                  }`}
                  title={`${seg.key} (${seg.label})`}
                />
              );
            })}

            {/* Precision Indicator Pip */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.9)] transition-all duration-500 ease-out pointer-events-none"
              style={{ left: `calc(${clampedScore}% - 2px)` }}
            />
          </div>

          {/* Scale Labels */}
          <div className="flex justify-between text-[9px] font-mono text-orca-dim px-0.5 select-none">
            <span>0 LOW</span>
            <span>30 MODERATE</span>
            <span>55 HIGH</span>
            <span>75 SEVERE</span>
            <span>100</span>
          </div>
        </div>
      )}
    </div>
  );
};
