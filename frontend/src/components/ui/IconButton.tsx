"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md select-none disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-base focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base";

    const variantStyles = {
      primary:
        "bg-accent-base text-[#040914] hover:bg-accent-base/90 active:bg-accent-base/80 shadow-sm",
      secondary:
        "bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-base hover:bg-surface-hover hover:border-border-strong active:bg-surface-base",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-base active:bg-surface-elevated",
      danger:
        "bg-hazard/15 text-hazard border border-hazard/30 hover:bg-hazard/25 active:bg-hazard/35",
      outline:
        "bg-transparent text-accent-base border border-accent-base/40 hover:bg-accent-soft hover:border-accent-base",
    };

    const sizeStyles = {
      sm: "w-7 h-7 text-xs",
      md: "w-9 h-9 text-sm",
      lg: "w-11 h-11 text-base",
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
