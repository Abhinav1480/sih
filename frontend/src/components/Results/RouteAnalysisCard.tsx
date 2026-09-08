"use client";

import React from "react";
import { Navigation, AlertTriangle, CheckCircle, ShieldAlert, Clock, Compass } from "lucide-react";
import { VesselRouteAnalysis } from "@/lib/types";

interface RouteAnalysisCardProps {
  route: VesselRouteAnalysis;
}

export const RouteAnalysisCard: React.FC<RouteAnalysisCardProps> = ({ route }) => {
  if (!route) return null;

  return (
    <div className="bg-orca-card border border-orca-border rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-orca-border/60 pb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-orca-muted font-bold">
            Vessel Passage & Corridor Intelligence
          </div>
          <div className="font-display font-bold text-lg text-white">
            {route.origin.name} → {route.destination.name}
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            route.crosses_protected_waters
              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
          }`}
        >
          {route.overall_route_risk} RISK
        </div>
      </div>

      {/* Corridor Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-orca-darkest/70 border border-orca-border">
          <span className="text-[10px] text-orca-muted uppercase block">Total Distance</span>
          <span className="font-display text-lg font-bold text-white">
            {route.total_distance_km} <span className="text-xs font-normal text-orca-muted">km</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-orca-darkest/70 border border-orca-border">
          <span className="text-[10px] text-orca-muted uppercase block">Estimated Transit</span>
          <span className="font-display text-lg font-bold text-orca-cyan flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {route.estimated_transit_hours} <span className="text-xs font-normal text-orca-muted">hours (at 10 kt)</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-orca-darkest/70 border border-orca-border col-span-2 sm:col-span-1">
          <span className="text-[10px] text-orca-muted uppercase block">Sanctuary Intersection</span>
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
        <div className="text-[11px] uppercase font-bold text-orca-muted">
          Corridor Waypoint Risk Sampling
        </div>
        <div className="space-y-1.5">
          {route.waypoints.map((wp, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-orca-darkest/60 border border-orca-border flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-orca-card text-orca-cyan font-bold text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-medium text-white text-[11px]">{wp.name}</div>
                  <div className="text-[10px] text-orca-muted">
                    {wp.latitude.toFixed(3)}°N, {wp.longitude.toFixed(3)}°E
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="text-[11px] text-slate-300">
                  <span>{wp.wave_height_m}m waves</span> · <span>{wp.wind_knots} kt</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
