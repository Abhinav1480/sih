"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-text-secondary select-none"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            "w-full min-h-[80px] rounded-md bg-surface-base border border-border-base p-3 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 resize-y",
            "hover:border-border-strong focus:outline-none focus:border-accent-base focus:ring-1 focus:ring-accent-base/40",
            "disabled:opacity-45 disabled:cursor-not-allowed disabled:bg-surface-subtle",
            error && "border-hazard focus:border-hazard focus:ring-hazard/30",
            className
          )}
          {...props}
        />

        {(error || helperText) && (
          <p
            className={cn(
              "text-[11px] leading-tight select-none",
              error ? "text-hazard" : "text-text-muted"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
