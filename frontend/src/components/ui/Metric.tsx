"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  delta?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    isFavorable?: boolean;
  };
  size?: "sm" | "md" | "lg";
}

export const Metric: React.FC<MetricProps> = ({
  className,
  label,
  value,
  unit,
  subtext,
  delta,
  size = "md",
  ...props
}) => {
  const valueSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  const deltaColors = {
    up: delta?.isFavorable === false ? "text-hazard" : "text-nominal",
    down: delta?.isFavorable === false ? "text-hazard" : "text-nominal",
    neutral: "text-text-muted",
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg bg-surface-subtle border border-border-subtle hover:border-border-base transition-colors",
        className
      )}
      {...props}
    >
      <div className="text-[11px] font-mono text-text-secondary uppercase tracking-wider select-none truncate">
        {label}
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        <span
          className={cn(
            "font-mono font-semibold text-text-primary tracking-tight",
            valueSizes[size]
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs text-text-muted select-none">
            {unit}
          </span>
        )}
      </div>

      {(subtext || delta) && (
        <div className="flex items-center gap-2 mt-1.5 text-xs select-none">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-mono text-[11px] font-medium",
                deltaColors[delta.direction]
              )}
            >
              {delta.direction === "up" && <ArrowUpRight className="w-3 h-3" />}
              {delta.direction === "down" && <ArrowDownRight className="w-3 h-3" />}
              {delta.direction === "neutral" && <Minus className="w-3 h-3" />}
              <span>{delta.value}</span>
            </span>
          )}
          {subtext && <span className="text-[11px] text-text-muted truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
