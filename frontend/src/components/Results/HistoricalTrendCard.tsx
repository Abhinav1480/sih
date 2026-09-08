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
    <div className="bg-orca-card border border-orca-border rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-orca-border/60 pb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-orca-muted font-bold">
            Historical Marine Analysis & Anomaly Detection
          </div>
          <div className="font-display font-bold text-lg text-white">
            {data.location_name} · <span className="text-sm font-normal text-slate-300">{data.period_description}</span>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-orca-cyan/10 border border-orca-cyan/30 text-orca-cyan">
          <History className="w-5 h-5" />
        </div>
      </div>

      {/* Trend Summary */}
      <div className="p-3.5 rounded-xl bg-orca-darkest/70 border border-orca-border text-xs leading-relaxed text-slate-200">
        <div className="font-semibold text-orca-cyan mb-1 flex items-center gap-1.5">
          <Activity className="w-4 h-4" />
          <span>Temporal Shift Synthesis</span>
        </div>
        <div>{data.trend_summary}</div>
      </div>

      {/* Change Indicators */}
      {data.change_reasons && data.change_reasons.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase font-bold text-orca-muted">
            Detected Physical Changes
          </div>
          {data.change_reasons.map((reason, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-orca-card/60 border border-orca-border text-slate-300 text-xs flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orca-cyan flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Time-Series Progression Points */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase font-bold text-orca-muted">
          Temporal Horizon Progression
        </div>
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {data.points.map((pt, idx) => (
            <div
              key={idx}
              className="p-2 rounded-xl bg-orca-darkest/80 border border-orca-border flex flex-col justify-between"
            >
              <span className="text-[10px] text-orca-muted font-mono">{pt.timestamp}</span>
              <div className="my-1">
                <span className="font-display text-sm font-bold text-white">
                  {pt.wave_height_m}m
                </span>
              </div>
              <span className="text-[9px] text-orca-cyan font-mono">{pt.wind_knots} kt</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
