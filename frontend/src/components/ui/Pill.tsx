"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  onRemove?: () => void;
}

export const Pill: React.FC<PillProps> = ({
  className,
  children,
  selected = false,
  size = "md",
  icon,
  onRemove,
  disabled,
  onClick,
  ...props
}) => {
  const isClickable = !!onClick && !disabled;

  const baseStyles =
    "inline-flex items-center rounded-full font-medium transition-all duration-150 select-none border";

  const sizeStyles = {
    sm: "text-[11px] h-6 px-2.5 gap-1.5",
    md: "text-xs h-7 px-3 gap-2",
  };

  const stateStyles = selected
    ? "bg-accent-base/15 text-accent-base border-accent-base/40 shadow-sm"
    : "bg-surface-base text-text-secondary border-border-base hover:text-text-primary hover:border-border-strong hover:bg-surface-elevated";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        baseStyles,
        sizeStyles[size],
        stateStyles,
        isClickable ? "cursor-pointer" : "cursor-default",
        disabled && "opacity-45 cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-base",
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
      <span className="truncate">{children}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:text-hazard ml-0.5 p-0.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Remove tag"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
};
