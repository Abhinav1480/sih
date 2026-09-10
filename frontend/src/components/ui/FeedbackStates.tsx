"use client";

import React from "react";
import { AlertCircle, RefreshCw, Compass, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/**
 * EmptyState: Technical, calm state displayed when no telemetry or analyses exist.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border-base bg-surface-subtle/40",
        className
      )}
      {...props}
    >
      <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-base flex items-center justify-center text-text-muted mb-3 shadow-inner">
        {icon || <Compass className="w-5 h-5 text-accent-base stroke-[1.75]" />}
      </div>
      <h4 className="text-sm font-semibold text-text-primary tracking-tight">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button
          size="sm"
          variant="secondary"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

/**
 * LoadingState: Technical scanner & telemetry sync state.
 */
export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  subtext?: string;
  variant?: "spinner" | "skeleton";
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Synthesizing ocean telemetry...",
  subtext = "Querying live oceanographic and meteorological feeds",
  variant = "spinner",
  className,
  ...props
}) => {
  if (variant === "skeleton") {
    return (
      <div className={cn("w-full space-y-2.5 animate-pulse", className)} {...props}>
        <div className="h-4 bg-surface-elevated rounded w-1/3" />
        <div className="h-10 bg-surface-base rounded-lg border border-border-subtle" />
        <div className="h-20 bg-surface-base rounded-lg border border-border-subtle" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-lg border border-border-subtle bg-surface-subtle/30",
        className
      )}
      {...props}
    >
      <div className="relative mb-3">
        <Loader2 className="w-7 h-7 text-accent-base animate-spin" />
        <div className="absolute inset-0 rounded-full border border-accent-base/20 animate-ping pointer-events-none" />
      </div>
      <div className="text-xs font-mono font-medium text-text-primary tracking-wider uppercase">
        {message}
      </div>
      {subtext && (
        <p className="text-[11px] text-text-muted mt-1 max-w-xs">
          {subtext}
        </p>
      )}
    </div>
  );
};

/**
 * ErrorState: High-visibility technical error banner or container with retry option.
 */
export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Telemetry Error",
  message,
  onRetry,
  compact = false,
  className,
  ...props
}) => {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-hazard/10 border border-hazard/30 text-xs text-hazard",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-shrink-0 underline hover:text-white font-medium"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center rounded-lg bg-hazard/10 border border-hazard/35 text-hazard",
        className
      )}
      {...props}
    >
      <div className="w-9 h-9 rounded-xl bg-hazard/15 border border-hazard/40 flex items-center justify-center mb-2.5">
        <AlertCircle className="w-5 h-5 text-hazard" />
      </div>
      <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
        {title}
      </h4>
      <p className="text-xs text-hazard/90 mt-1 max-w-sm leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          size="sm"
          variant="danger"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="mt-3.5"
        >
          Retry Connection
        </Button>
      )}
    </div>
  );
};
