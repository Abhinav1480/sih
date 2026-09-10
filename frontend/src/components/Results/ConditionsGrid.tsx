"use client";

import React from "react";
import { Waves, Wind, Thermometer, Compass, Eye, AlertOctagon } from "lucide-react";
import { OceanObservation, WeatherObservation } from "@/lib/types";

interface ConditionsGridProps {
  ocean?: OceanObservation;
  weather?: WeatherObservation;
}

interface Metric {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}

export const ConditionsGrid: React.FC<ConditionsGridProps> = ({ ocean, weather }) => {
  const metrics: Metric[] = [];

  if (ocean) {
    metrics.push({
      label: "Wave",
      value: `${ocean.significant_wave_height_m}`,
      unit: "m",
      sub: ocean.sea_state,
      icon: Waves,
      accent: "text-orca-cyan",
    });
  }
  if (weather) {
    metrics.push({
      label: "Wind",
      value: `${weather.wind_speed_knots}`,
      unit: "kt",
      sub: `Gusts ${weather.wind_gust_knots} · ${weather.wind_direction_deg}°`,
      icon: Wind,
      accent: "text-sky-400",
    });
  }
  if (ocean) {
    metrics.push({
      label: "Swell",
      value: `${ocean.swell_height_m}`,
      unit: "m",
      sub: `T ${ocean.swell_period_sec}s · ${ocean.swell_direction_deg}°`,
      icon: Compass,
      accent: "text-teal-400",
    });
    metrics.push({
      label: "SST",
      value: `${ocean.sea_surface_temp_c}`,
      unit: "°C",
      sub: `Current ${ocean.ocean_current_speed_m_s} m/s`,
      icon: Thermometer,
      accent: "text-amber-400",
    });
  }
  if (weather) {
    metrics.push({
      label: "Visibility",
      value: `${weather.visibility_km}`,
      unit: "km",
      sub: `Rain ${weather.precipitation_mm} mm/h`,
      icon: Eye,
      accent: "text-slate-300",
    });
  }

  const alertLevel = weather?.alert_level;
  const alertColor =
    alertLevel === "Orange" || alertLevel === "Red"
      ? "text-rose-400"
      : alertLevel === "Yellow"
      ? "text-amber-400"
      : "text-emerald-400";

  if (metrics.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold text-slate-200">Conditions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-orca-dim font-semibold mb-1">
                <Icon className={`w-3 h-3 ${m.accent}`} />
                <span>{m.label}</span>
              </div>
              <div className="leading-none">
                <span className="font-display text-[22px] font-bold text-white">{m.value}</span>
                {m.unit && <span className="text-xs text-orca-muted ml-1">{m.unit}</span>}
              </div>
              {m.sub && <div className="text-[10.5px] text-orca-dim font-mono truncate mt-1">{m.sub}</div>}
            </div>
          );
        })}

        {/* IMD advisory */}
        {weather && (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-orca-dim font-semibold mb-1">
              <AlertOctagon className={`w-3 h-3 ${alertColor}`} />
              <span>IMD</span>
            </div>
            <div className={`font-display text-[18px] font-bold ${alertColor} leading-none`}>
              {(alertLevel || "Green").toUpperCase()}
            </div>
            <div className="text-[10.5px] text-orca-dim truncate mt-1">
              {weather.storm_warning || "No active warning"}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
