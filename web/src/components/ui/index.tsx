"use client";

/**
 * Base primitives. Every chip that carries a colour is keyed on the value
 * the response sent and renders that value (or its localised label) as text
 * beside an icon. Nothing here bands, defaults or judges.
 */
import { useT } from "@/lib/i18n";
import type { ReactNode } from "react";
import { IconCaution, IconCheck, IconNeutral, IconStop } from "./Icons";

export function Surface({ className = "", children, as: Tag = "div", ...rest }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" | "aside" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`surface ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`mono ${className}`}>{children}</span>;
}

/** The explicit absence marker. Used wherever a value is null, never replaced by a number. */
export function Unavailable({ label }: { label?: string }) {
  const t = useT();
  return <span className="text-text-3 italic">{label ?? t("common.unavailable")}</span>;
}

// --- verdict, band, tier, status ---------------------------------------------

/** Verdict to risk class. A verdict outside the contract enum renders neutral, with its raw text. */
export function verdictClass(verdict: string): "LOW" | "MODERATE" | "HIGH" | "NONE" {
  switch (verdict) {
    case "GO": return "LOW";
    case "CAUTION": return "MODERATE";
    case "NO_GO": return "HIGH";
    default: return "NONE";
  }
}

export function bandClass(band: string | null | undefined): "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "NONE" {
  switch (band) {
    case "LOW": case "MODERATE": case "HIGH": case "SEVERE": return band;
    default: return "NONE";
  }
}

export function VerdictIcon({ verdict, size }: { verdict: string; size?: number }) {
  switch (verdict) {
    case "GO": return <IconCheck size={size} />;
    case "CAUTION": return <IconCaution size={size} />;
    case "NO_GO": return <IconStop size={size} />;
    default: return <IconNeutral size={size} />;
  }
}

export function verdictLabel(t: ReturnType<typeof useT>, verdict: string): string {
  switch (verdict) {
    case "GO": return t("verdict.GO");
    case "CAUTION": return t("verdict.CAUTION");
    case "NO_GO": return t("verdict.NO_GO");
    case "NOT_APPLICABLE": return t("verdict.NOT_APPLICABLE");
    default: return verdict;
  }
}

export function bandLabel(t: ReturnType<typeof useT>, band: string): string {
  switch (band) {
    case "LOW": return t("band.LOW");
    case "MODERATE": return t("band.MODERATE");
    case "HIGH": return t("band.HIGH");
    case "SEVERE": return t("band.SEVERE");
    default: return band;
  }
}

export function VerdictChip({ verdict, className = "" }: { verdict: string; className?: string }) {
  const t = useT();
  return (
    <span className={`chip risk-${verdictClass(verdict)} ${className}`}>
      <VerdictIcon verdict={verdict} size={14} />
      {verdictLabel(t, verdict)}
    </span>
  );
}

export function BandChip({ band, className = "" }: { band: string; className?: string }) {
  const t = useT();
  return <span className={`chip risk-${bandClass(band)} ${className}`}>{bandLabel(t, band)}</span>;
}

/** Renders the tier exactly as sent. An unknown tier renders its raw text with a dotted chip. */
export function TierChip({ tier, className = "", title = true }: { tier: string | null | undefined; className?: string; title?: boolean }) {
  const t = useT();
  const known = tier === "ISRO" || tier === "NATIONAL" || tier === "FALLBACK";
  const cls = known ? `tier-${tier}` : "tier-UNKNOWN";
  const label = tier === "ISRO" ? t("tier.ISRO") : tier === "NATIONAL" ? t("tier.NATIONAL") : tier === "FALLBACK" ? t("tier.FALLBACK") : t("tier.unknown");
  return (
    <span className={`chip mono ${cls} ${className}`} title={title ? label : undefined}>
      {tier ? tier : t("tier.unknown")}
    </span>
  );
}

export function statusLabel(t: ReturnType<typeof useT>, status: string): string {
  switch (status) {
    case "LIVE": return t("status.LIVE");
    case "FORECAST": return t("status.FORECAST");
    case "CACHED": return t("status.CACHED");
    case "HISTORICAL": return t("status.HISTORICAL");
    case "DEMO": return t("status.DEMO");
    case "UNAVAILABLE": return t("status.UNAVAILABLE");
    default: return status;
  }
}

export function StatusChip({ status, className = "" }: { status: string; className?: string }) {
  const t = useT();
  return (
    <span className={`chip chip-muted ${className}`}>
      <span className="mono">{status}</span>
      <span className="font-normal">· {statusLabel(t, status)}</span>
    </span>
  );
}

export function severityClass(sev: string): "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "NONE" {
  switch (sev) {
    case "INFO": return "NONE";
    case "CAUTION": return "MODERATE";
    case "WARNING": return "HIGH";
    case "SEVERE": return "SEVERE";
    default: return "NONE";
  }
}

export function severityLabel(t: ReturnType<typeof useT>, sev: string): string {
  switch (sev) {
    case "INFO": return t("severity.INFO");
    case "CAUTION": return t("severity.CAUTION");
    case "WARNING": return t("severity.WARNING");
    case "SEVERE": return t("severity.SEVERE");
    default: return sev;
  }
}

export function SeverityChip({ severity, className = "" }: { severity: string; className?: string }) {
  const t = useT();
  const cls = severityClass(severity);
  return (
    <span className={`chip risk-${cls} ${className}`}>
      {cls === "NONE" ? <IconNeutral size={14} /> : cls === "SEVERE" || cls === "HIGH" ? <IconStop size={14} /> : <IconCaution size={14} />}
      {severityLabel(t, severity)}
    </span>
  );
}

// --- layout helpers ------------------------------------------------------------

export function Disclosure({ title, summary, children, open, className = "" }: { title: ReactNode; summary?: ReactNode; children: ReactNode; open?: boolean; className?: string }) {
  return (
    <details className={`group surface-2 ${className}`} open={open}>
      <summary className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-semibold">{title}</span>
        <span className="flex items-center gap-2 text-sm text-text-2">
          {summary}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-180" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </summary>
      <div className="panel-body px-4 pb-4">{children}</div>
    </details>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="surface-2 px-5 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-text-2">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="surface-2 px-5 py-6" role="alert">
      <p className="font-semibold ink-HIGH flex items-center gap-2"><IconCaution size={16} />{title ?? t("common.error.title")}</p>
      {body && <p className="mt-1 text-sm text-text-2">{body}</p>}
      {onRetry && (
        <button type="button" className="btn btn-sm mt-3" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-3">{hint}</span>}
    </label>
  );
}

/** A key/value row: label on the left, monospace value on the right. */
export function KV({ label, children, mono = true }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-hairline last:border-0">
      <span className="text-sm text-text-2">{label}</span>
      <span className={`text-right ${mono ? "mono" : ""}`}>{children}</span>
    </div>
  );
}
