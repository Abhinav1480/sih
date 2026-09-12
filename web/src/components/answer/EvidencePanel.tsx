"use client";

/**
 * Evidence: every record with provider, tier badge (exactly as sent),
 * dataset, value and unit, observation time, status and the reliability
 * note; then `meta.limitations` and `meta.notes`.
 */
import { useFmt, useT } from "@/lib/i18n";
import type { Envelope } from "@/lib/types";
import { Mono, StatusChip, TierChip, Unavailable } from "@/components/ui";

export function EvidenceList({ envelope, ids }: { envelope: Envelope; ids?: string[] }) {
  const t = useT();
  const f = useFmt();
  const cited = ids ? new Set(ids) : null;
  const records = cited ? envelope.evidence.filter((e) => cited.has(e.id)) : envelope.evidence;
  if (records.length === 0) return <p className="text-sm text-text-2">{t("evidence.empty")}</p>;
  return (
    <ul className="space-y-3">
      {records.map((e, i) => (
        <li key={`${e.id}-${i}`} className="surface-2 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{e.variable}</span>
            <span className="flex items-center gap-2">
              <TierChip tier={e.provider_tier} />
              <StatusChip status={e.status} />
            </span>
          </div>
          <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <Row label={t("answer.value")}><Mono>{f.raw(e.value)}{e.unit ? ` ${e.unit}` : ""}</Mono></Row>
            <Row label={t("evidence.provider")}>{e.provider ? e.provider : <Unavailable />}</Row>
            <Row label={t("common.dataset")}>{e.dataset ? e.dataset : <Unavailable />}</Row>
            <Row label={t("common.observed")}><Mono>{e.observation_or_forecast_time ? f.raw(e.observation_or_forecast_time) : <Unavailable />}</Mono></Row>
            <Row label={t("common.retrieved")}><Mono>{f.dateTime(e.retrieval_time)}</Mono></Row>
            <Row label={t("common.location")}>{e.location ? f.raw(e.location) : <Unavailable />}{e.coordinates ? <Mono className="ml-1 text-xs text-text-3">{f.raw(e.coordinates)}</Mono> : null}</Row>
          </div>
          {e.reliability_notes && (
            <details className="mt-2">
              <summary className="text-xs text-text-2">{t("evidence.notes")}</summary>
              <p className="panel-body mt-1 text-xs text-text-2 leading-relaxed">{f.raw(e.reliability_notes)}</p>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-xs text-text-3">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function LimitationsList({ envelope }: { envelope: Envelope }) {
  const t = useT();
  const f = useFmt();
  return (
    <div className="space-y-3">
      {envelope.meta.limitations.length > 0 && (
        <div>
          <div className="eyebrow mb-1">{t("answer.limitations")}</div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-2">{envelope.meta.limitations.map((l, i) => <li key={i}>{f.raw(l)}</li>)}</ul>
        </div>
      )}
      {envelope.meta.notes.length > 0 && (
        <div>
          <div className="eyebrow mb-1">{t("answer.notes")}</div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-2">{envelope.meta.notes.map((l, i) => <li key={i}>{f.raw(l)}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export function EvidencePanel({ envelope }: { envelope: Envelope }) {
  return (
    <div className="space-y-5">
      <EvidenceList envelope={envelope} />
      <LimitationsList envelope={envelope} />
    </div>
  );
}
