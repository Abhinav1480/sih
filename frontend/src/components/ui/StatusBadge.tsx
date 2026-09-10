"use client";

import React from "react";
import {
  Radio,
  Clock,
  Database,
  History,
  FlaskConical,
  Info,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataFreshness } from "@/lib/types";

export type StatusType =
  | DataFreshness
  | "LIVE"
  | "FORECAST"
  | "CACHED"
  | "HISTORICAL"
  | "DEMO"
  | "INFO"
  | "CAUTION"
  | "WARNING"
  | "SEVERE";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  showIcon = true,
  className,
  ...props
}) => {
  const normStatus = (status || "DEMO").toUpperCase() as StatusType;

  // Configuration mapping status to label, icon, and semantic styles
  const config: Record<
    string,
    {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      styles: string;
      dotColor: string;
      pulse?: boolean;
    }
  > = {
    LIVE: {
      label: "LIVE",
      icon: Radio,
      styles: "bg-nominal/15 text-nominal border-nominal/35",
      dotColor: "bg-nominal",
      pulse: true,
    },
    FORECAST: {
      label: "FORECAST",
      icon: Clock,
      styles: "bg-operational/15 text-operational border-operational/35",
      dotColor: "bg-operational",
    },
    CACHED: {
      label: "CACHED",
      icon: Database,
      styles: "bg-purple-500/15 text-purple-400 border-purple-500/35",
      dotColor: "bg-purple-400",
    },
    HISTORICAL: {
      label: "HISTORICAL",
      icon: History,
      styles: "bg-text-muted/15 text-text-secondary border-text-muted/30",
      dotColor: "bg-text-muted",
    },
    DEMO: {
      label: "DEMO MATRIX",
      icon: FlaskConical,
      styles: "bg-advisory/15 text-advisory border-advisory/35",
      dotColor: "bg-advisory",
    },
    UNAVAILABLE: {
      label: "OFFLINE",
      icon: History,
      styles: "bg-hazard/15 text-hazard border-hazard/35",
      dotColor: "bg-hazard",
    },
    // Alert Level Modifiers
    INFO: {
      label: "INFO",
      icon: Info,
      styles: "bg-operational/15 text-operational border-operational/35",
      dotColor: "bg-operational",
    },
    CAUTION: {
      label: "CAUTION",
      icon: AlertTriangle,
      styles: "bg-advisory/15 text-advisory border-advisory/35",
      dotColor: "bg-advisory",
    },
    WARNING: {
      label: "WARNING",
      icon: AlertOctagon,
      styles: "bg-orange-500/15 text-orange-400 border-orange-500/35",
      dotColor: "bg-orange-400",
    },
    SEVERE: {
      label: "SEVERE",
      icon: ShieldAlert,
      styles: "bg-hazard/15 text-hazard border-hazard/40",
      dotColor: "bg-hazard",
      pulse: true,
    },
  };

  const item = config[normStatus] || config.DEMO;
  const Icon = item.icon;

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-[11px] px-2 py-0.5 gap-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
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
      {showIcon && (
        <Icon className={cn(iconSizes[size], "flex-shrink-0", item.pulse && "animate-pulse")} />
      )}
      <span>{item.label}</span>
    </span>
  );
};
