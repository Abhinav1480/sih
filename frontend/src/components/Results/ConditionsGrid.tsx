"use client";

import React from "react";
import { Waves, Wind, Thermometer, Compass, Eye, AlertOctagon } from "lucide-react";
import { OceanObservation, WeatherObservation } from "@/lib/types";

interface ConditionsGridProps {
  ocean?: OceanObservation;
  weather?: WeatherObservation;
}

export const ConditionsGrid: React.FC<ConditionsGridProps> = ({ ocean, weather }) => {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-orca-muted font-bold">
        Key Environmental Conditions
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Wave Height */}
        {ocean && (
          <div className="bg-orca-card border border-orca-border p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-orca-muted text-[11px]">
              <span>Wave Height</span>
              <Waves className="w-3.5 h-3.5 text-orca-cyan" />
            </div>
            <div className="my-1">
              <span className="font-display text-xl font-bold text-white">
                {ocean.significant_wave_height_m}
              </span>
              <span className="text-xs text-orca-muted ml-1">m (SWH)</span>
            </div>
            <div className="text-[10px] text-orca-teal font-medium">
              Sea: {ocean.sea_state}
            </div>
          </div>
        )}

        {/* Swell State */}
        {ocean && (
          <div className="bg-orca-card border border-orca-border p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-orca-muted text-[11px]">
              <span>Swell Surge</span>
              <Compass className="w-3.5 h-3.5 text-orca-teal" />
            </div>
            <div className="my-1">
              <span className="font-display text-xl font-bold text-white">
                {ocean.swell_height_m}
              </span>
              <span className="text-xs text-orca-muted ml-1">m</span>
            </div>
            <div className="text-[10px] text-orca-muted">
              Period: {ocean.swell_period_sec}s · Dir: {ocean.swell_direction_deg}°
            </div>
          </div>
        )}

        {/* Sea Surface Temperature */}
        {ocean && (
          <div className="bg-orca-card border border-orca-border p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-orca-muted text-[11px]">
              <span>SST Surface</span>
              <Thermometer className="w-3.5 h-3.5 text-orca-amber" />
            </div>
            <div className="my-1">
              <span className="font-display text-xl font-bold text-white">
                {ocean.sea_surface_temp_c}
              </span>
              <span className="text-xs text-orca-muted ml-1">°C</span>
            </div>
            <div className="text-[10px] text-emerald-400">
              Current: {ocean.ocean_current_speed_m_s} m/s
            </div>
          </div>
        )}

        {/* Wind Speed */}
        {weather && (
          <div className="bg-orca-card border border-orca-border p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-orca-muted text-[11px]">
              <span>Surface Wind</span>
              <Wind className="w-3.5 h-3.5 text-orca-blue" />
            </div>
            <div className="my-1">
              <span className="font-display text-xl font-bold text-white">
                {weather.wind_speed_knots}
              </span>
              <span className="text-xs text-orca-muted ml-1">knots</span>
            </div>
            <div className="text-[10px] text-orca-muted">
              Gusts: {weather.wind_gust_knots} kt ({weather.wind_direction_deg}°)
            </div>
          </div>
        )}

        {/* Visibility & Rain */}
        {weather && (
          <div className="bg-orca-card border border-orca-border p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-orca-muted text-[11px]">
              <span>Visibility</span>
              <Eye className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="my-1">
              <span className="font-display text-xl font-bold text-white">
                {weather.visibility_km}
              </span>
              <span className="text-xs text-orca-muted ml-1">km</span>
            </div>
            <div className="text-[10px] text-orca-muted">
              Precip: {weather.precipitation_mm} mm
            </div>
          </div>
        )}

        {/* Coastal Warning Alert */}
        {weather && (
          <div className="bg-orca-card border border-orca-border p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-orca-muted text-[11px]">
              <span>IMD Warning</span>
              <AlertOctagon className="w-3.5 h-3.5 text-orca-amber" />
            </div>
            <div className="my-1">
              <span
                className={`font-display text-lg font-bold ${
                  weather.alert_level === "Orange" || weather.alert_level === "Red"
                    ? "text-rose-400"
                    : weather.alert_level === "Yellow"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {weather.alert_level.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-orca-muted truncate">
              {weather.storm_warning || "No severe weather alert"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
