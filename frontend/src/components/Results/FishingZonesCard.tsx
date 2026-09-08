"use client";

import React from "react";
import { Fish, ShieldAlert, CheckCircle, Navigation, MapPin } from "lucide-react";
import { PotentialFishingZone } from "@/lib/types";

interface FishingZonesCardProps {
  zones: PotentialFishingZone[];
  locationName: string;
}

export const FishingZonesCard: React.FC<FishingZonesCardProps> = ({ zones, locationName }) => {
  if (!zones || zones.length === 0) return null;

  return (
    <div className="bg-orca-card border border-orca-border rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-orca-border/60 pb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-orca-muted font-bold">
            Fisheries & PFZ Intelligence
          </div>
          <div className="font-display font-bold text-lg text-white">
            Ranked Fishing Grounds near {locationName}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          <Fish className="w-3.5 h-3.5" />
          <span>{zones.length} Active Zones</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {zones.map((zone) => (
          <div
            key={zone.zone_id}
            className={`p-3.5 rounded-xl border transition ${
              zone.within_mpa
                ? "bg-rose-500/5 border-rose-500/30"
                : "bg-orca-darkest/70 border-orca-border hover:border-orca-cyan/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orca-card border border-orca-cyan/40 text-orca-cyan font-bold text-xs flex items-center justify-center">
                  #{zone.rank}
                </span>
                <span className="font-bold text-sm text-white">{zone.name}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-orca-cyan">
                  {zone.suitability_score}
                </span>
                <span className="text-[10px] text-orca-muted font-normal"> / 100</span>
              </div>
            </div>

            {/* Suitability score bar */}
            <div className="w-full bg-orca-darkest h-1.5 rounded-full overflow-hidden mb-2.5">
              <div
                className={`h-full rounded-full ${
                  zone.within_mpa
                    ? "bg-rose-500"
                    : zone.suitability_score > 70
                    ? "bg-gradient-to-r from-orca-teal to-orca-cyan"
                    : "bg-amber-500"
                }`}
                style={{ width: `${zone.suitability_score}%` }}
              />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-orca-muted block text-[10px]">Chlorophyll-a</span>
                <span className="font-semibold text-emerald-400">{zone.chlorophyll_mg_m3} mg/m³</span>
              </div>
              <div>
                <span className="text-orca-muted block text-[10px]">Thermal Front (SST)</span>
                <span className="font-semibold text-white">{zone.sst_c} °C</span>
              </div>
              <div>
                <span className="text-orca-muted block text-[10px]">Distance & Bearing</span>
                <span className="font-semibold text-white">
                  {zone.distance_km} km ({zone.bearing_deg}°)
                </span>
              </div>
              <div>
                <span className="text-orca-muted block text-[10px]">Local Sea State</span>
                <span className="font-semibold text-white">{zone.wave_height_m}m waves</span>
              </div>
            </div>

            {/* MPA Warning or Clean Clearance */}
            <div className="mt-2.5 pt-2 border-t border-orca-border/40 flex items-center justify-between text-[11px]">
              {zone.within_mpa ? (
                <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>RESTRICTED: Lies inside {zone.mpa_name || "Sanctuary"}. Trawling prohibited.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Clear of Marine Sanctuaries · Sustainable Artisanal Fishing Permitted</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
