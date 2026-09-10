"use client";

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, options, error, helperText, id, disabled, children, ...props },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-text-secondary select-none"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              "w-full h-9 appearance-none rounded-md bg-surface-base border border-border-base pl-3 pr-8 text-sm text-text-primary transition-all duration-150",
              "hover:border-border-strong focus:outline-none focus:border-accent-base focus:ring-1 focus:ring-accent-base/40",
              "disabled:opacity-45 disabled:cursor-not-allowed disabled:bg-surface-subtle",
              error && "border-hazard focus:border-hazard focus:ring-hazard/30",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-surface-elevated text-text-primary"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = "Select";
