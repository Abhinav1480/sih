"use client";

import React, { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Database, Check, Clock } from "lucide-react";
import { EvidenceRecord } from "@/lib/types";

interface EvidenceDrawerProps {
  evidence: EvidenceRecord[];
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ evidence }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  const providerSummary = Array.from(new Set(evidence.map((e) => e.provider))).slice(0, 3).join(" · ");

  return (
    <div className="border border-orca-border/70 rounded-xl overflow-hidden text-xs bg-white/[0.015]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Evidence &amp; Data</span>
          <span className="text-[10px] text-orca-dim font-mono hidden sm:inline">
            {providerSummary}
          </span>
        </div>
        <div className="flex items-center gap-2 text-orca-dim">
          <span className="text-[10px] font-mono">{evidence.length}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-orca-border space-y-2.5 max-h-72 overflow-y-auto bg-orca-darkest/40">
          <div className="text-[11px] text-orca-muted italic mb-2">
            Every metric synthesized in this analysis is tied to an authoritative data feed with verifiable timestamps.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {evidence.map((rec) => (
              <div
                key={rec.id}
                className="p-2.5 rounded-lg bg-orca-card border border-orca-border flex flex-col gap-1 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1">
                    <Database className="w-3 h-3 text-orca-cyan" />
                    {rec.variable}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      rec.status === "LIVE"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : rec.status === "FORECAST"
                        ? "bg-blue-500/20 text-blue-300"
                        : rec.status === "HISTORICAL"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>

                <div className="text-sm font-semibold text-orca-cyan my-0.5">
                  {rec.value} <span className="text-xs text-orca-muted font-normal">{rec.unit}</span>
                </div>

                <div className="text-orca-muted text-[10px]">
                  Provider: <span className="text-slate-300">{rec.provider}</span> ({rec.dataset})
                </div>

                <div className="text-orca-muted text-[10px] flex items-center justify-between border-t border-orca-border/40 pt-1 mt-0.5">
                  <span>Target: {rec.location}</span>
                  <span className="font-mono">{rec.observation_or_forecast_time}</span>
                </div>

                {rec.reliability_notes && (
                  <div className="text-[10px] text-slate-400 bg-orca-darkest/50 p-1 rounded font-mono mt-0.5">
                    * {rec.reliability_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
