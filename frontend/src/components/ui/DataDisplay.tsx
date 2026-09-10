"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Renders an authoritative physical or oceanographic measurement with monospace digits and unit.
 * Example: 2.96 m, 26.3 kt, 29.8 °C
 */
export interface MeasurementProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string;
  unit: string;
  precision?: number;
  highlight?: boolean;
}

export const Measurement: React.FC<MeasurementProps> = ({
  value,
  unit,
  precision,
  highlight = false,
  className,
  ...props
}) => {
  const formatted =
    typeof value === "number" && precision !== undefined ? value.toFixed(precision) : value;

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-mono",
        highlight ? "text-accent-base font-semibold" : "text-text-primary",
        className
      )}
      {...props}
    >
      <span className="font-semibold">{formatted}</span>
      <span className="text-text-muted text-xs font-normal select-none">{unit}</span>
    </span>
  );
};

/**
 * Formats marine geospatial coordinates into standardized GPS representation.
 * Example: 17.687°N, 83.219°E
 */
export interface CoordinateProps extends React.HTMLAttributes<HTMLSpanElement> {
  lat: number;
  lon: number;
  precision?: number;
}

export const Coordinate: React.FC<CoordinateProps> = ({
  lat,
  lon,
  precision = 3,
  className,
  ...props
}) => {
  const latStr = `${Math.abs(lat).toFixed(precision)}°${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(precision)}°${lon >= 0 ? "E" : "W"}`;

  return (
    <span
      className={cn("inline-flex items-center gap-1 font-mono text-xs text-text-secondary select-all", className)}
      {...props}
    >
      <span>{latStr}</span>
      <span className="text-text-muted">,</span>
      <span>{lonStr}</span>
    </span>
  );
};

/**
 * Formats mission timestamps into concise operational time.
 */
export interface TimestampProps extends React.HTMLAttributes<HTMLTimeElement> {
  date: string | Date;
  format?: "time" | "datetime" | "relative" | "utc";
}

export const Timestamp: React.FC<TimestampProps> = ({
  date,
  format = "datetime",
  className,
  ...props
}) => {
  const d = typeof date === "string" ? new Date(date) : date;
  const isValid = !isNaN(d.getTime());

  if (!isValid) {
    return <span className={cn("font-mono text-xs text-text-muted", className)}>--:--</span>;
  }

  let formatted = d.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (format === "time") {
    formatted = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  } else if (format === "utc") {
    formatted = `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  }

  return (
    <time
      dateTime={d.toISOString()}
      className={cn("font-mono text-xs text-text-secondary select-none tracking-tight", className)}
      {...props}
    >
      {formatted}
    </time>
  );
};

/**
 * Formats voyage or transit durations. Example: 3h 45m
 */
export interface DurationProps extends React.HTMLAttributes<HTMLSpanElement> {
  hours: number;
}

export const Duration: React.FC<DurationProps> = ({ hours, className, ...props }) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  return (
    <span className={cn("font-mono text-xs text-text-primary", className)} {...props}>
      {h > 0 && <span className="font-semibold">{h}h </span>}
      <span className="font-semibold">{m}m</span>
    </span>
  );
};

/**
 * Formats marine distances with clean nautical unit. Example: 42.5 km, 22.9 nm
 */
export interface DistanceProps extends React.HTMLAttributes<HTMLSpanElement> {
  km: number;
  unit?: "km" | "nm";
}

export const Distance: React.FC<DistanceProps> = ({ km, unit = "km", className, ...props }) => {
  const val = unit === "nm" ? km * 0.539957 : km;

  return (
    <span className={cn("inline-flex items-baseline gap-1 font-mono text-xs text-text-primary", className)} {...props}>
      <span className="font-semibold">{val.toFixed(1)}</span>
      <span className="text-text-muted select-none">{unit}</span>
    </span>
  );
};

/**
 * Formats technical percentages with sign & color. Example: +14.2%
 */
export interface PercentageProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  precision?: number;
  showSign?: boolean;
}

export const Percentage: React.FC<PercentageProps> = ({
  value,
  precision = 1,
  showSign = false,
  className,
  ...props
}) => {
  const sign = showSign && value > 0 ? "+" : "";
  return (
    <span className={cn("font-mono font-medium text-xs", className)} {...props}>
      {sign}{value.toFixed(precision)}%
    </span>
  );
};
