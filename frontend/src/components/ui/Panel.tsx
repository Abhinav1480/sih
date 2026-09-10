"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  elevation?: "base" | "elevated" | "subtle";
  noPadding?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  className,
  title,
  description,
  icon,
  actions,
  footer,
  elevation = "base",
  noPadding = false,
  children,
  ...props
}) => {
  const elevationStyles = {
    base: "bg-surface-base border-border-base",
    elevated: "bg-surface-elevated border-border-base",
    subtle: "bg-surface-subtle border-border-subtle",
  };

  const hasHeader = !!title || !!description || !!icon || !!actions;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        elevationStyles[elevation],
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="text-accent-base flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-text-primary tracking-tight truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}

      <div className={cn(!noPadding && "p-4")}>{children}</div>

      {footer && (
        <div className="px-4 py-2.5 bg-surface-subtle/50 border-t border-border-subtle rounded-b-lg flex items-center justify-between text-xs text-text-secondary">
          {footer}
        </div>
      )}
    </div>
  );
};
