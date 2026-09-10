"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  divider?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  className,
  title,
  subtitle,
  actions,
  divider = false,
  children,
  ...props
}) => {
  return (
    <section
      className={cn("w-full py-4 space-y-3", divider && "border-b border-border-subtle", className)}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between gap-3 select-none">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-text-primary tracking-tight uppercase tracking-wider text-[11px] font-mono">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
};
