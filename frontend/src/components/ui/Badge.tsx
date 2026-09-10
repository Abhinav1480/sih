"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  dot = false,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-mono font-medium rounded select-none uppercase tracking-wider";

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1 leading-none",
    md: "text-[11px] px-2 py-0.5 gap-1.5 leading-tight",
  };

  const variantStyles = {
    default: "bg-surface-elevated text-text-secondary border border-border-base",
    accent: "bg-accent-base/15 text-accent-base border border-accent-base/35",
    success: "bg-nominal/15 text-nominal border border-nominal/35",
    warning: "bg-advisory/15 text-advisory border border-advisory/35",
    danger: "bg-hazard/15 text-hazard border border-hazard/35",
    info: "bg-operational/15 text-operational border border-operational/35",
  };

  const dotColors = {
    default: "bg-text-secondary",
    accent: "bg-accent-base",
    success: "bg-nominal",
    warning: "bg-advisory",
    danger: "bg-hazard",
    info: "bg-operational",
  };

  return (
    <span
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
