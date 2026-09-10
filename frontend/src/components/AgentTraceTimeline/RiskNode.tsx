"use client";

import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { TraceItem, RiskCategory } from "@/lib/types";

interface RiskNodeProps {
  item: TraceItem;
  isLast?: boolean;
}

export const RiskNode: React.FC<RiskNodeProps> = ({ item, isLast = false }) => {
  const meta = item.metadata || {};
  const score = typeof meta.score === "number" ? meta.score : 0;
  const band: RiskCategory = (meta.band as RiskCategory) || "LOW";
  const factors: string[] = meta.key_factors || [];

  const bandStyles = {
    LOW: {
      bulletBorder: "border-emerald-400/50",
      bulletBg: "bg-emerald-950/40 text-emerald-300",
      badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    },
    MODERATE: {
      bulletBorder: "border-amber-400/50",
      bulletBg: "bg-amber-950/40 text-amber-300",
      badge: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    },
    HIGH: {
      bulletBorder: "border-orange-400/50",
      bulletBg: "bg-orange-950/40 text-orange-300",
      badge: "bg-orange-500/10 border-orange-500/30 text-orange-300",
    },
    SEVERE: {
      bulletBorder: "border-rose-400/50",
      bulletBg: "bg-rose-950/40 text-rose-300",
      badge: "bg-rose-500/10 border-rose-500/30 text-rose-300",
    },
  }[band] || {
    bulletBorder: "border-orca-cyan/40",
    bulletBg: "bg-orca-dark text-orca-cyan",
    badge: "bg-orca-cyan/10 border-orca-cyan/30 text-orca-cyan",
  };

  return (
    <div className="relative flex gap-3 group text-xs animate-fadeIn">
      {/* Vertical Hairline Guide */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-orca-border/70 group-hover:bg-orca-border transition-colors" />
      )}

      {/* Node Bullet */}
      <div
        className={`relative z-10 flex-shrink-0 w-[23px] h-[23px] rounded-full border ${bandStyles.bulletBorder} ${bandStyles.bulletBg} flex items-center justify-center shadow-sm`}
      >
        {band === "LOW" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      </div>

      {/* Card Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="p-2.5 rounded-lg bg-orca-dark/60 border border-orca-border/60 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white text-[11px] uppercase tracking-wider">
              RISK ENGINE
            </span>
            <span
              className={`px-2 py-0.5 rounded-full border text-[10.5px] font-mono tabular-nums font-semibold ${bandStyles.badge}`}
            >
              {band} · {score} / 100
            </span>
          </div>

          {/* Key factors */}
          {factors.length > 0 && (
            <div className="pt-1.5 border-t border-orca-border/40">
              <span className="text-[10px] text-orca-muted uppercase tracking-wider block mb-1 font-mono tabular-nums">
                Key Contributing Factors
              </span>
              <div className="flex flex-wrap gap-1.5">
                {factors.map((factor, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-white/[0.03] border border-orca-border text-slate-300 text-[10.5px]"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
