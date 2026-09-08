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
    <div className="bg-orca-card border border-orca-border rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-orca-border/60 pb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-orca-muted font-bold">
            Regional Marine Comparison
          </div>
          <div className="font-display font-bold text-lg text-white flex items-center gap-2">
            <span>{data.location_a.name}</span>
            <span className="text-orca-cyan font-normal text-sm">vs</span>
            <span>{data.location_b.name}</span>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-orca-cyan/10 border border-orca-cyan/30 text-orca-cyan">
          <GitCompare className="w-5 h-5" />
        </div>
      </div>

      {/* Comparative Verdict */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-orca-blue/20 to-orca-cyan/20 border border-orca-cyan/30 text-xs leading-relaxed text-slate-100 flex items-start gap-2.5">
        <Award className="w-5 h-5 text-orca-cyan flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-orca-cyan mb-0.5">Comparative Verdict</div>
          {data.overall_verdict}
        </div>
      </div>

      {/* Metrics Table */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase font-bold text-orca-muted">
          Cross-Sector Parameter Breakdown
        </div>
        <div className="space-y-2">
          {data.metrics.map((m, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-orca-darkest/70 border border-orca-border space-y-2 text-xs"
            >
              <div className="flex items-center justify-between font-medium">
                <span className="text-white">{m.metric_name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-orca-card border border-orca-border text-orca-cyan font-semibold">
                  {m.favorability}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-orca-border/40">
                <div>
                  <span className="text-[10px] text-orca-muted block">{data.location_a.name}</span>
                  <span className="font-bold text-sm text-white">
                    {m.location_a_value} <span className="text-[10px] font-normal text-orca-muted">{m.unit}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-orca-muted block">{data.location_b.name}</span>
                  <span className="font-bold text-sm text-white">
                    {m.location_b_value} <span className="text-[10px] font-normal text-orca-muted">{m.unit}</span>
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
