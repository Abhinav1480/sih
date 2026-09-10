"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, AlertOctagon, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskCategory } from "@/lib/types";

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  category: RiskCategory;
  score?: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  category,
  score,
  showIcon = true,
  size = "md",
  className,
  ...props
}) => {
  const norm = (category || "LOW").toUpperCase() as RiskCategory;

  const config = {
    LOW: {
      label: "LOW RISK",
      icon: ShieldCheck,
      styles: "bg-nominal/15 text-nominal border-nominal/35",
      iconColor: "text-nominal",
    },
    MODERATE: {
      label: "MODERATE RISK",
      icon: AlertTriangle,
      styles: "bg-advisory/15 text-advisory border-advisory/35",
      iconColor: "text-advisory",
    },
    HIGH: {
      label: "HIGH RISK",
      icon: AlertOctagon,
      styles: "bg-orange-500/15 text-orange-400 border-orange-500/35",
      iconColor: "text-orange-400",
    },
    SEVERE: {
      label: "SEVERE RISK",
      icon: ShieldAlert,
      styles: "bg-hazard/15 text-hazard border-hazard/40",
      iconColor: "text-hazard",
    },
  };

  const item = config[norm] || config.LOW;
  const Icon = item.icon;

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-[11px] px-2.5 py-1 gap-1.5",
    lg: "text-xs px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-semibold rounded border select-none tracking-wider leading-none",
        item.styles,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {showIcon && <Icon className={cn(iconSizes[size], "flex-shrink-0", item.iconColor)} />}
      <span>{item.label}</span>
      {score !== undefined && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-bold">{score}/100</span>
        </>
      )}
    </span>
  );
};

export interface RiskIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  category: RiskCategory;
  score: number;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  category,
  score,
  className,
  ...props
}) => {
  const norm = (category || "LOW").toUpperCase() as RiskCategory;

  const barColors = {
    LOW: "bg-nominal",
    MODERATE: "bg-advisory",
    HIGH: "bg-orange-400",
    SEVERE: "bg-hazard",
  };

  return (
    <div className={cn("w-full space-y-1.5", className)} {...props}>
      <div className="flex items-center justify-between text-xs select-none">
        <RiskBadge category={norm} size="sm" />
        <span className="font-mono text-xs font-semibold text-text-primary">
          {score}<span className="text-text-muted font-normal">/100</span>
        </span>
      </div>

      <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden border border-border-subtle">
        <div
          className={cn("h-full transition-all duration-300 rounded-full", barColors[norm] || "bg-nominal")}
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};
