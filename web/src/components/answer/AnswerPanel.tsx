"use client";

/**
 * The panel beside the conversation: the verdict, large, with its band
 * colour and icon; three key numbers in monospace; Why and Evidence,
 * expandable; the trace; the map; and the cards. Every number is the
 * response's own, or an explicit unavailable.
 */
import { useFmt, useT } from "@/lib/i18n";
import type { Envelope } from "@/lib/types";
import { CONTRACT_VERSION, evidenceMatching } from "@/lib/types";
import { Disclosure, Mono, TierChip, Unavailable, VerdictIcon, verdictClass, verdictLabel, BandChip, StatusChip } from "@/components/ui";
import { IconCaution, IconInfo } from "@/components/ui/Icons";
import { WhyPanel } from "./WhyPanel";
import { EvidencePanel } from "./EvidencePanel";
import { TraceRows } from "./TracePanel";
import { CardView } from "./Cards";
import { AnswerMap } from "@/components/map/AnswerMap";

export function KeyNumber({ label, value, unit, note, tier, status }: { label: string; value: string | null; unit?: string; note?: string; tier?: string; status?: string }) {
  const f = useFmt();
  return (
    <div className="surface-2 px-4 py-3">
      <div className="text-xs text-text-2">{label}</div>
      <div className="mt-0.5 text-xl">
        {value === null ? <Unavailable /> : <Mono>{f.raw(value)}{unit ? <span className="ml-1 text-sm text-text-2">{unit}</span> : null}</Mono>}
      </div>
      {(tier || status) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {tier && <TierChip tier={tier} />}
          {status && <StatusChip status={status} />}
        </div>
      )}
      {note && <div className="mt-1 text-xs text-text-3">{note}</div>}
    </div>
  );
}

export function VerdictBlock({ envelope, large = true }: { envelope: Envelope; large?: boolean }) {
  const t = useT();
  const f = useFmt();
  const v = envelope.answer.verdict;
  const cls = verdictClass(v);
  const meaningKey = v === "GO" || v === "CAUTION" || v === "NO_GO" || v === "NOT_APPLICABLE" ? (`verdict.meaning.${v}` as const) : null;
  return (
    <div className={`flex items-start gap-4 rounded-[var(--radius)] border p-4 risk-${cls}`} style={{ borderColor: "currentColor" }}>
      <VerdictIcon verdict={v} size={large ? 40 : 28} />
      <div className="min-w-0">
        <div className={`${large ? "text-3xl" : "text-xl"} font-bold leading-tight`}>{verdictLabel(t, v)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text">
          {envelope.risk && <BandChip band={envelope.risk.band} />}
          {envelope.risk && <Mono className="text-text-2">{f.int(envelope.risk.score)} / 100</Mono>}
          <Mono className="text-text-2">{t("common.confidence")} {f.int(envelope.answer.confidence)}%</Mono>
        </div>
        {meaningKey && <p className="mt-1 text-sm text-text-2">{t(meaningKey)}</p>}
      </div>
    </div>
  );
}

export function Banners({ envelope, capturedQuestion }: { envelope: Envelope; capturedQuestion?: string | null }) {
  const t = useT();
  const f = useFmt();
  return (
    <div className="space-y-2 text-sm">
      {envelope.meta.contract_version !== CONTRACT_VERSION && (
        <p className="surface-2 flex items-start gap-2 px-3 py-2 ink-HIGH"><IconCaution size={16} className="mt-0.5 shrink-0" />{t("answer.contractMismatch", { got: envelope.meta.contract_version, want: CONTRACT_VERSION })}</p>
      )}
      {capturedQuestion && (
        <p className="surface-2 flex items-start gap-2 px-3 py-2 text-text-2"><IconInfo size={16} className="mt-0.5 shrink-0" /><span>{t("common.recorded")}: “{f.raw(capturedQuestion)}”</span></p>
      )}
      {envelope.meta.mode === "DEMO" && (
        <p className="surface-2 flex items-start gap-2 px-3 py-2 text-text-2"><IconInfo size={16} className="mt-0.5 shrink-0" />{t("answer.mode.DEMO")}</p>
      )}
      {envelope.meta.degraded && (
        <p className="surface-2 flex items-start gap-2 px-3 py-2 ink-MODERATE"><IconCaution size={16} className="mt-0.5 shrink-0" />{t("answer.degraded")}</p>
      )}
    </div>
  );
}

export function AnswerPanel({ envelope, capturedQuestion, showMap = true, showTrace = true }: { envelope: Envelope; capturedQuestion?: string | null; showMap?: boolean; showTrace?: boolean }) {
  const t = useT();
  const f = useFmt();
  const wave = evidenceMatching(envelope, /wave height/i);
  const wind = evidenceMatching(envelope, /wind/i);
  const end = envelope.meta.temporal.end_time;
  const clarification = envelope.intent === "needs_clarification";
  return (
    <div className="space-y-4 arrive">
      <Banners envelope={envelope} capturedQuestion={capturedQuestion} />

      {clarification ? (
        <div className="surface-2 p-4">
          <div className="eyebrow mb-1">{t("answer.clarify")}</div>
          <p className="text-lg font-semibold">{f.raw(envelope.answer.headline)}</p>
        </div>
      ) : (
        <VerdictBlock envelope={envelope} />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <KeyNumber label={t("answer.wave")} value={wave ? wave.value : null} unit={wave?.unit} tier={wave?.provider_tier} status={wave?.status} note={wave ? f.raw(wave.observation_or_forecast_time) : undefined} />
        <KeyNumber label={t("answer.wind")} value={wind ? wind.value : null} unit={wind?.unit} tier={wind?.provider_tier} status={wind?.status} note={wind ? f.raw(wind.observation_or_forecast_time) : undefined} />
        <KeyNumber label={t("answer.validUntil")} value={end ? f.dateTime(end) : null} note={t("answer.validUntilNote")} />
      </div>

      <div className="surface-2 p-4">
        <div className="eyebrow mb-1">{t("answer.headline")}</div>
        <p className="font-semibold">{f.raw(envelope.answer.headline)}</p>
        <details className="mt-2">
          <summary className="text-sm text-text-2">{t("answer.narrative")}</summary>
          <p className="panel-body mt-2 text-sm leading-relaxed text-text-2">{f.raw(envelope.answer.narrative)}</p>
        </details>
        <p className="mt-2 text-xs text-text-3">
          {t("common.location")}: {f.raw(envelope.meta.location.name)} · {t("common.window")}: {f.raw(envelope.meta.temporal.label)} · {t("answer.intent")}: <Mono>{envelope.intent}</Mono>
        </p>
      </div>

      <Disclosure title={t("answer.why")} summary={envelope.risk ? <Mono>{f.int(envelope.risk.score)} / 100</Mono> : t("answer.noRisk")} open>
        <WhyPanel risk={envelope.risk} />
      </Disclosure>

      <Disclosure title={t("answer.evidence")} summary={t("evidence.count", { n: f.int(envelope.evidence.length) })}>
        <EvidencePanel envelope={envelope} />
      </Disclosure>

      {showTrace && (
        <Disclosure title={t("answer.trace")} summary={t("trace.count", { n: f.int(envelope.trace.length) })}>
          <TraceRows events={envelope.trace} />
        </Disclosure>
      )}

      {showMap && (
        <div>
          <div className="eyebrow mb-2">{t("ai.mapTitle")}</div>
          <AnswerMap envelope={envelope} className="h-80" />
        </div>
      )}

      <div className="space-y-3">
        {envelope.cards.map((c, i) => <CardView key={`${c.id}-${i}`} card={c} envelope={envelope} compact />)}
      </div>
    </div>
  );
}
