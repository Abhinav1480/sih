"use client";

import React from "react";
import { RouteComparisonData, RouteCandidate, VesselRouteAnalysis } from "@/lib/types";
import {
  GitCompare,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Waves,
  Wind,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface RouteComparisonCardProps {
  comparison?: RouteComparisonData;
  route?: VesselRouteAnalysis;
}

export const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  comparison,
  route,
}) => {
  const compData = comparison || route?.route_comparison;
  const candidates = route?.candidate_routes || [];
  const selectedId = route?.selected_route_id || "recommended";

  if (!compData && candidates.length === 0) return null;

  const recCandidate = candidates.find((c) => c.is_recommended);
  const altCandidate = candidates.find((c) => !c.is_recommended);
  const selectedCandidate = candidates.find((c) => c.id === selectedId) || recCandidate;

  return (
    <div className="maritime-card p-5 space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5 font-mono">
            <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Route Corridor Comparative Analysis</span>
          </div>
          <div className="font-display font-bold text-lg text-white mt-0.5">
            {route ? `${route.origin.name} → ${route.destination.name}` : "Passage Options"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 font-mono ${
              selectedId === "alternative"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            }`}
          >
            <span className="text-slate-400 text-[10px] uppercase">Active:</span>
            <span className="uppercase">{selectedId}</span>
          </span>
        </div>
      </div>

      {/* Candidate Route Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recommended Corridor Card */}
        {recCandidate && (
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedId === "recommended"
                ? "bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-black/40 ring-1 ring-emerald-500/30"
                : "bg-orca-darkest/60 border-white/[0.06] opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>Recommended Safe Corridor</span>
              </span>
              {selectedId === "recommended" && (
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Selected
                </span>
              )}
            </div>

            <div className="text-white font-bold text-sm mb-1.5">{recCandidate.name}</div>

            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 mb-2">
              <div>
                <span className="text-slate-400 text-[10px] block font-mono">Distance</span>
                <b className="text-white">{recCandidate.distance_km} km</b>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-mono">Transit</span>
                <b className="text-white">{recCandidate.estimated_transit_hours} hrs</b>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-mono">Marine Risk</span>
                <span className="text-emerald-400 font-bold">{recCandidate.marine_risk}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 leading-relaxed bg-black/25 p-2.5 rounded-lg border border-white/[0.05]">
              {recCandidate.trade_offs}
            </div>
          </div>
        )}

        {/* Alternative Corridor Card */}
        {altCandidate && (
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedId === "alternative"
                ? "bg-amber-950/20 border-amber-500/50 shadow-lg shadow-black/40 ring-1 ring-amber-500/30"
                : "bg-orca-darkest/60 border-white/[0.06] opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>Alternative / Direct Corridor</span>
              </span>
              {selectedId === "alternative" && (
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  Selected
                </span>
              )}
            </div>

            <div className="text-white font-bold text-sm mb-1.5">{altCandidate.name}</div>

            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 mb-2">
              <div>
                <span className="text-slate-400 text-[10px] block font-mono">Distance</span>
                <b className="text-white">{altCandidate.distance_km} km</b>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-mono">Transit</span>
                <b className="text-white">{altCandidate.estimated_transit_hours} hrs</b>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-mono">Marine Risk</span>
                <span
                  className={
                    altCandidate.marine_risk === "HIGH" ? "text-rose-400 font-bold" : "text-amber-400 font-bold"
                  }
                >
                  {altCandidate.marine_risk}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 leading-relaxed bg-black/25 p-2.5 rounded-lg border border-white/[0.05]">
              {altCandidate.trade_offs}
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Metrics Table */}
      {compData && compData.metrics && compData.metrics.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between font-mono">
            <span>Passage Parameters Comparison</span>
            <span className="text-cyan-400 font-normal">Side-by-side evaluation</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-orca-darkest/70">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 bg-orca-darkest/90 border-b border-white/[0.06] font-mono">
                <tr>
                  <th className="py-2.5 px-3">Metric</th>
                  <th className="py-2.5 px-3 text-emerald-300">Recommended Route</th>
                  <th className="py-2.5 px-3 text-amber-300">Alternative Route</th>
                  <th className="py-2.5 px-3 text-right">Advantage / Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-medium">
                {compData.metrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 px-3 text-white font-semibold flex items-center gap-1.5">
                      {m.metric_name === "Distance" && <Navigation className="w-3.5 h-3.5 text-cyan-400" />}
                      {m.metric_name === "Marine Risk" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      {m.metric_name === "Wave Exposure" && <Waves className="w-3.5 h-3.5 text-blue-400" />}
                      {m.metric_name === "Wind Exposure" && <Wind className="w-3.5 h-3.5 text-slate-400" />}
                      {m.metric_name === "Protected Area" && <ShieldAlert className="w-3.5 h-3.5 text-pink-400" />}
                      {m.metric_name === "Estimated Transit" && <Clock className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{m.metric_name}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-200">{m.recommended_value}</td>
                    <td className="py-2 px-3 text-slate-200">{m.alternative_value}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orca-panel border border-white/[0.08] text-cyan-400 font-mono">
                        {m.advantage} ({m.difference})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operational Trade-Off Directive */}
      {compData?.trade_off_analysis && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/30 to-cyan-950/20 border border-cyan-500/25 text-xs leading-relaxed text-slate-200 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Navigational Trade-Off Verdict</span>
            <span>{compData.trade_off_analysis}</span>
          </div>
        </div>
      )}
    </div>
  );
};
