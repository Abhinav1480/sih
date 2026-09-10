"use client";

import React from "react";
import { GitCompare, Award, ArrowRight } from "lucide-react";
import { RegionalComparisonData } from "@/lib/types";

interface ComparisonCardProps {
  data: RegionalComparisonData;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="maritime-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono tabular-nums">
            Regional Marine Comparison
          </div>
          <div className="font-display font-bold text-lg text-white flex items-center gap-2 mt-0.5">
            <span>{data.location_a.name}</span>
            <span className="text-cyan-400 font-normal text-sm font-mono tabular-nums">vs</span>
            <span>{data.location_b.name}</span>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
          <GitCompare className="w-5 h-5" />
        </div>
      </div>

      {/* Comparative Verdict */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/30 to-cyan-950/20 border border-cyan-500/25 text-xs leading-relaxed text-slate-200 flex items-start gap-2.5">
        <Award className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-cyan-400 mb-0.5 font-mono tabular-nums uppercase text-[10px]">Comparative Verdict</div>
          <div>{data.overall_verdict}</div>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-bold text-slate-400 font-mono tabular-nums">
          Cross-Sector Parameter Breakdown
        </div>
        <div className="space-y-2">
          {data.metrics.map((m, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-orca-darkest/70 border border-white/[0.06] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between font-medium">
                <span className="text-white font-semibold">{m.metric_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orca-panel border border-white/[0.08] text-cyan-400 font-mono tabular-nums font-semibold">
                  {m.favorability}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono tabular-nums">{data.location_a.name}</span>
                  <span className="font-bold text-sm text-white font-mono tabular-nums">
                    {m.location_a_value} <span className="text-[10px] font-normal text-slate-400">{m.unit}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono tabular-nums">{data.location_b.name}</span>
                  <span className="font-bold text-sm text-white font-mono tabular-nums">
                    {m.location_b_value} <span className="text-[10px] font-normal text-slate-400">{m.unit}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
