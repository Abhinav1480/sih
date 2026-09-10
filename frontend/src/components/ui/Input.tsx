"use client";

import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
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

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 pointer-events-none text-text-muted flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              "w-full h-9 rounded-md bg-surface-base border border-border-base px-3 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150",
              "hover:border-border-strong focus:outline-none focus:border-accent-base focus:ring-1 focus:ring-accent-base/40",
              "disabled:opacity-45 disabled:cursor-not-allowed disabled:bg-surface-subtle",
              leftIcon ? "pl-9" : "pl-3",
              rightIcon || error ? "pr-9" : "pr-3",
              error && "border-hazard text-hazard placeholder:text-hazard/60 focus:border-hazard focus:ring-hazard/30",
              className
            )}
            {...props}
          />

          {error ? (
            <div className="absolute right-3 pointer-events-none text-hazard flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            rightIcon && (
              <div className="absolute right-3 pointer-events-none text-text-muted flex items-center justify-center">
                {rightIcon}
              </div>
            )
          )}
        </div>

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

Input.displayName = "Input";
