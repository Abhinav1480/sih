"use client";

import React from "react";
import { History, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { HistoricalTrendData } from "@/lib/types";

interface HistoricalTrendCardProps {
  data: HistoricalTrendData;
}

export const HistoricalTrendCard: React.FC<HistoricalTrendCardProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="maritime-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono tabular-nums">
            Historical Marine Analysis & Anomaly Detection
          </div>
          <div className="font-display font-bold text-lg text-white mt-0.5">
            {data.location_name} <span className="text-slate-400 font-normal text-sm">· {data.period_description}</span>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
          <History className="w-5 h-5" />
        </div>
      </div>

      {/* Trend Summary */}
      <div className="p-3.5 rounded-xl bg-orca-darkest/70 border border-white/[0.06] text-xs leading-relaxed text-slate-200">
        <div className="font-semibold text-cyan-400 mb-1 flex items-center gap-1.5">
          <Activity className="w-4 h-4" />
          <span>Temporal Shift Synthesis</span>
        </div>
        <div>{data.trend_summary}</div>
      </div>

      {/* Change Indicators */}
      {data.change_reasons && data.change_reasons.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono tabular-nums">
            Detected Physical Changes
          </div>
          {data.change_reasons.map((reason, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-orca-darkest/60 border border-white/[0.06] text-slate-200 text-xs flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Time-Series Progression Points */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono tabular-nums">
          Temporal Horizon Progression
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          {data.points.map((pt, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-orca-darkest/80 border border-white/[0.06] hover:border-cyan-500/40 transition-colors flex flex-col justify-between"
            >
              <span className="text-[10px] text-slate-400 font-mono tabular-nums">{pt.timestamp}</span>
              <div className="my-1">
                <span className="font-mono tabular-nums text-sm font-bold text-white">
                  {pt.wave_height_m}m
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono tabular-nums font-medium">{pt.wind_knots} kt</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
