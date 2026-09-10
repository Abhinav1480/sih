"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
  ...props
}) => {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 select-none",
        variant === "underline" && "border-b border-border-base",
        variant === "pills" && "bg-surface-subtle p-1 rounded-lg border border-border-subtle",
        className
      )}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        if (variant === "pills") {
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                isActive
                  ? "bg-surface-elevated text-text-primary shadow-sm border border-border-base font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-base/50",
                tab.disabled && "opacity-40 cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-base"
              )}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-accent-base/20 text-accent-base" : "bg-surface-base text-text-muted"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 -mb-[1px]",
              isActive
                ? "border-accent-base text-text-primary font-semibold"
                : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-strong",
              tab.disabled && "opacity-40 cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-base"
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  isActive ? "bg-accent-base/15 text-accent-base font-bold" : "bg-surface-subtle text-text-muted"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
