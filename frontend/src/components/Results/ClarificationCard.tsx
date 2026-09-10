"use client";

import React from "react";
import { HelpCircle, MapPin, Compass } from "lucide-react";

interface ClarificationCardProps {
  question?: string;
  missingInfo?: string[];
  onSelectLocation?: (locationName: string) => void;
}

const COMMON_PORTS = [
  { name: "Visakhapatnam", region: "Bay of Bengal", state: "Andhra Pradesh" },
  { name: "Chennai", region: "Coromandel Coast", state: "Tamil Nadu" },
  { name: "Kakinada", region: "Godavari Coast", state: "Andhra Pradesh" },
  { name: "Paradip", region: "Odisha Coast", state: "Odisha" },
  { name: "Mumbai", region: "Arabian Sea", state: "Maharashtra" },
  { name: "Kochi", region: "Malabar Coast", state: "Kerala" },
  { name: "Thoothukudi", region: "Gulf of Mannar", state: "Tamil Nadu" },
  { name: "Porbandar", region: "Kathiawar Coast", state: "Gujarat" },
];

export const ClarificationCard: React.FC<ClarificationCardProps> = ({
  question,
  missingInfo,
  onSelectLocation,
}) => {
  return (
    <div className="maritime-card p-5 space-y-4 border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-orca-panel to-orca-darkest">
      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider font-mono">
        <HelpCircle className="w-4 h-4 text-amber-400" />
        <span>Clarification Required for Hyper-Local Telemetry</span>
      </div>

      <div className="space-y-2">
        <h3 className="text-white text-base md:text-lg font-bold leading-snug">
          {question || "Which coastal port, harbor, or coordinates would you like ORCA to analyze?"}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          ORCA avoids inaccurate assumptions and does not use hardcoded locations. Please specify your operational zone or select a major coastal hub below to retrieve verified INCOIS ocean state forecasts.
        </p>
      </div>

      {missingInfo && missingInfo.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {missingInfo.map((info, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20"
            >
              Missing: {info}
            </span>
          ))}
        </div>
      )}

      {onSelectLocation && (
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select a coastal node to proceed:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMMON_PORTS.map((port) => (
              <button
                key={port.name}
                type="button"
                onClick={() => onSelectLocation(port.name)}
                className="flex flex-col text-left p-2.5 rounded-xl bg-orca-darkest/80 border border-white/[0.06] hover:border-cyan-500/50 hover:bg-cyan-500/10 transition group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-300">
                  <span>{port.name}</span>
                  <MapPin className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">{port.region}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
