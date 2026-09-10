"use client";

import React from "react";
import { ShieldAlert, CheckCircle } from "lucide-react";
import { PotentialFishingZone } from "@/lib/types";
import { EvidenceTrigger } from "@/components/Evidence/EvidenceTrigger";

interface FishingZonesCardProps {
  zones: PotentialFishingZone[];
  locationName: string;
}

export const FishingZonesCard: React.FC<FishingZonesCardProps> = ({ zones, locationName }) => {
  if (!zones || zones.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-200">
          Fishing Zones near {locationName}
        </h3>
        <span className="text-[10px] text-orca-dim font-mono tabular-nums">{zones.length} evaluated</span>
      </div>

      <div className="divide-y divide-orca-border/50">
        {zones.map((zone) => (
          <div key={zone.zone_id} className="py-3 first:pt-0 last:pb-0 space-y-2">
            {/* Row header */}
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center flex-shrink-0 font-mono tabular-nums ${
                  zone.within_mpa
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : zone.rank === 1
                    ? "bg-orca-cyan text-orca-darkest"
                    : "bg-white/[0.06] text-slate-300"
                }`}
              >
                {zone.rank}
              </span>
              <span className="font-semibold text-[13.5px] text-white flex-1 truncate">{zone.name}</span>
              <span className="text-right flex-shrink-0">
                <span
                  className={`font-mono tabular-nums font-semibold text-[13px] ${
                    zone.within_mpa
                      ? "text-rose-400"
                      : zone.suitability_score >= 70
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {zone.suitability_score}
                </span>
                <span className="text-[10px] text-orca-dim">/100</span>
              </span>
            </div>

            {/* Suitability bar */}
            <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  zone.within_mpa ? "bg-rose-500" : zone.suitability_score > 70 ? "bg-orca-cyan" : "bg-amber-500"
                }`}
                style={{ width: `${Math.max(zone.suitability_score, 5)}%` }}
              />
            </div>

            {/* Compact metrics */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-orca-dim">
              <span>Chl <span className="text-emerald-400">{zone.chlorophyll_mg_m3}</span> mg/m³</span>
              <span>SST <span className="text-slate-300">{zone.sst_c}</span>°C</span>
              <span><span className="text-slate-300">{zone.distance_km}</span> km · {zone.bearing_deg}°</span>
              <span>Wave <span className="text-slate-300">{zone.wave_height_m}</span> m</span>
              <EvidenceTrigger
                variableHint={zone.name}
                label={`Why ranked #${zone.rank}?`}
                className="ml-auto"
              />
            </div>

            {/* Status line */}
            {zone.within_mpa ? (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
                <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                <span>Restricted · overlaps {zone.mpa_name || "Marine Sanctuary"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90">
                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                <span>Clear of sanctuaries · operations permitted</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
