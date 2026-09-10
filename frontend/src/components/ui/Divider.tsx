"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  subtle?: boolean;
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  className,
  orientation = "horizontal",
  subtle = true,
  label,
  ...props
}) => {
  const borderColor = subtle ? "border-border-subtle" : "border-border-base";

  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("inline-block h-full w-[1px] border-l self-stretch mx-2", borderColor, className)}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn("flex items-center gap-3 w-full my-3", className)}
        {...props}
      >
        <div className={cn("flex-1 border-t", borderColor)} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted select-none">
          {label}
        </span>
        <div className={cn("flex-1 border-t", borderColor)} />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("w-full border-t my-3", borderColor, className)}
      {...props}
    />
  );
};
