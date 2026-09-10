"use client";

import React from "react";
import { Navigation, AlertTriangle, CheckCircle, ShieldAlert, Clock, Compass } from "lucide-react";
import { VesselRouteAnalysis } from "@/lib/types";
import { RiskGauge } from "../Risk/RiskGauge";

interface RouteAnalysisCardProps {
  route: VesselRouteAnalysis;
}

export const RouteAnalysisCard: React.FC<RouteAnalysisCardProps> = ({ route }) => {
  if (!route) return null;

  const scoreMap = {
    LOW: 18,
    MODERATE: 30,
    HIGH: 65,
    SEVERE: 85,
  };
  const routeScore = scoreMap[route.overall_route_risk] ?? 30;

  return (
    <div className="maritime-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono tabular-nums">
            Vessel Passage & Corridor Intelligence
          </div>
          <div className="font-display font-bold text-lg text-white mt-0.5">
            {route.origin.name} → {route.destination.name}
          </div>
        </div>
        <RiskGauge
          band={route.overall_route_risk}
          score={routeScore}
          label="CORRIDOR HAZARD"
          compact
        />
      </div>

      {/* Corridor Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-orca-darkest/70 border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 uppercase block font-mono tabular-nums">Total Distance</span>
          <span className="font-mono tabular-nums text-lg font-bold text-white">
            {route.total_distance_km} <span className="text-xs font-normal text-slate-400 font-mono tabular-nums">km</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-orca-darkest/70 border border-white/[0.06]">
          <span className="text-[10px] text-slate-400 uppercase block font-mono tabular-nums">Estimated Transit</span>
          <span className="font-mono tabular-nums text-lg font-bold text-cyan-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {route.estimated_transit_hours} <span className="text-xs font-normal text-slate-400 font-mono tabular-nums">hours (at 10 kt)</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-orca-darkest/70 border border-white/[0.06] col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-400 uppercase block font-mono tabular-nums">Sanctuary Status</span>
          <span
            className={`font-display text-sm font-bold flex items-center gap-1.5 mt-0.5 ${
              route.crosses_protected_waters ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {route.crosses_protected_waters ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {route.crosses_protected_waters ? "Crosses MPAs" : "Zero Violations"}
          </span>
        </div>
      </div>

      {/* Recommended Action Advisory */}
      <div
        className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
          route.crosses_protected_waters
            ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
        }`}
      >
        <div className="font-bold flex items-center gap-1.5 mb-1">
          {route.crosses_protected_waters ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
          <span>Operational Directive</span>
        </div>
        <div>{route.recommended_action}</div>
        {route.alternative_route_notes && (
          <div className="mt-2 text-[11px] text-slate-300 italic">
            * {route.alternative_route_notes}
          </div>
        )}
      </div>

      {/* Waypoint Risk Table */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-bold text-slate-400 font-mono tabular-nums">
          Corridor Waypoint Risk Sampling
        </div>
        <div className="space-y-1.5">
          {route.waypoints.map((wp, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-orca-darkest/70 border border-white/[0.06] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-orca-panel border border-white/[0.08] text-cyan-400 font-bold text-[10px] flex items-center justify-center font-mono tabular-nums">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-medium text-white text-[11px]">{wp.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {wp.latitude.toFixed(3)}°N, {wp.longitude.toFixed(3)}°E
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="text-[11px] text-slate-300 font-mono tabular-nums">
                  <span>{wp.wave_height_m}m waves</span> · <span>{wp.wind_knots} kt</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono tabular-nums ${
                    wp.segment_risk === "HIGH"
                      ? "bg-rose-500/20 text-rose-400"
                      : wp.segment_risk === "MODERATE"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {wp.segment_risk}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
