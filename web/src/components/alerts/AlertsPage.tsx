"use client";

/**
 * Alerts: the hazard feed from GET /api/alerts (bulletins, with an honest
 * statement when no feed is connected) and the request-scoped alerts from
 * the person's recent answers, by severity, each linking to its evidence. A
 * geofence warning is a full-width persistent interrupt (GeofenceInterrupt).
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFmt, useT } from "@/lib/i18n";
import { fetchAlerts, ApiError } from "@/lib/api/client";
import { useHomeLocation } from "@/lib/store/home";
import { useConversations, latestEnvelopeIn } from "@/lib/store/conversations";
import type { AlertBulletin, AlertRecord, Envelope } from "@/lib/types";
import { EmptyState, ErrorState, Mono, SeverityChip, Skeleton, StatusChip, Surface, TierChip, Unavailable } from "@/components/ui";
import { EvidenceList } from "@/components/answer/EvidencePanel";
import { GeofenceInterrupt } from "@/components/answer/GeofenceInterrupt";
import { apiErrorText } from "@/components/ai/OrcaAI";

const ORDER: Record<string, number> = { SEVERE: 0, WARNING: 1, CAUTION: 2, INFO: 3 };
const rank = (s: string) => (s in ORDER ? ORDER[s] : 4);

export function AlertsPage() {
  const t = useT();
  const f = useFmt();
  const home = useHomeLocation();
  const [nonce, setNonce] = useState(0);
  const feedKey = `${home ? `${home.latitude},${home.longitude}` : "none"}#${nonce}`;
  const [result, setResult] = useState<{ key: string; feed: AlertBulletin[] | null; error: string | null } | null>(null);
  const feed = result?.key === feedKey ? result.feed : null;
  const error = result?.key === feedKey ? result.error : null;
  const conversations = useConversations();

  useEffect(() => {
    let cancelled = false;
    fetchAlerts(home ? { latitude: home.latitude, longitude: home.longitude } : null)
      .then((a) => { if (!cancelled) setResult({ key: feedKey, feed: a, error: null }); })
      .catch((e) => { if (!cancelled) setResult({ key: feedKey, feed: null, error: e instanceof ApiError ? e.code : "network" }); });
    return () => { cancelled = true; };
  }, [feedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const latest = useMemo(() => latestEnvelopeIn(conversations)?.envelope ?? null, [conversations]);
  const fromAnswers = useMemo(() => {
    const out: { alert: AlertRecord; envelope: Envelope; query: string }[] = [];
    const seen = new Set<string>();
    for (const c of conversations) {
      for (const turn of [...c.turns].reverse()) {
        if (!turn.envelope) continue;
        for (const a of turn.envelope.alerts) {
          const key = `${a.title}|${a.issued_at}|${a.valid_until ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ alert: a, envelope: turn.envelope, query: turn.query });
        }
      }
    }
    return out.sort((a, b) => rank(a.alert.severity) - rank(b.alert.severity));
  }, [conversations]);

  const sortedFeed = useMemo(() => (feed ? [...feed].sort((a, b) => rank(a.severity) - rank(b.severity)) : null), [feed]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("alerts.title")}</h1>
      <GeofenceInterrupt envelope={latest} />

      <section className="space-y-3">
        <h2 className="eyebrow">{t("alerts.feed")}</h2>
        {sortedFeed === null && !error && <Skeleton className="h-24 w-full" />}
        {error && <ErrorState title={t("alerts.failed")} body={apiErrorText(t, error)} onRetry={() => setNonce((n) => n + 1)} />}
        {sortedFeed && sortedFeed.length === 0 && <EmptyState title={t("alerts.empty")} />}
        {sortedFeed?.map((a) => (
          <Surface key={a.alert_id} as="article" className="p-4 arrive">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={a.severity} />
              <h3 className="font-semibold">{a.title}</h3>
              <TierChip tier={a.provider_tier} />
              <StatusChip status={a.status} />
              <span className={`chip ${a.is_agency_bulletin ? "risk-LOW" : "chip-muted"}`}>{a.is_agency_bulletin ? t("alerts.bulletin") : t("alerts.notBulletin")}</span>
            </div>
            <p className="mt-2 text-sm">{f.raw(a.description)}</p>
            {a.recommended_action && <p className="mt-2 text-sm"><span className="text-text-2">{t("alerts.action")}: </span>{f.raw(a.recommended_action)}</p>}
            <p className="mt-2 text-xs text-text-3">
              {t("common.source")}: {a.source} · {t("alerts.sector")}: {a.sector} · {t("alerts.issued")}: <Mono>{f.dateTime(a.issued_at)}</Mono> · {t("common.validUntil")}: <Mono>{a.valid_until ? f.dateTime(a.valid_until) : <Unavailable />}</Mono>
            </p>
          </Surface>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">{t("alerts.fromAnswers")}</h2>
        {fromAnswers.length === 0 && <EmptyState title={t("alerts.empty")} action={<Link href="/ai" className="btn btn-sm">{t("nav.ai")}</Link>} />}
        {fromAnswers.map(({ alert: a, envelope, query }) => (
          <Surface key={a.id + a.issued_at} as="article" className="p-4 arrive">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={a.severity} />
              <h3 className="font-semibold">{a.title}</h3>
              <Mono className="text-xs text-text-3">{a.type}</Mono>
              <TierChip tier={a.provider_tier} />
            </div>
            <p className="mt-2 text-sm">{f.raw(a.description)}</p>
            {a.recommended_action && <p className="mt-2 text-sm text-text-2">{f.raw(a.recommended_action)}</p>}
            <p className="mt-2 text-xs text-text-3">
              {t("common.source")}: {a.source} · {t("common.location")}: {f.raw(envelope.meta.location.name)} · {t("alerts.issued")}: <Mono>{f.dateTime(a.issued_at)}</Mono> · {t("common.validUntil")}: <Mono>{a.valid_until ? f.dateTime(a.valid_until) : <Unavailable />}</Mono>
            </p>
            <p className="mt-1 text-xs text-text-3">{t("trips.question")}: “{query}”</p>
            <details className="mt-2">
              <summary className="text-sm text-[var(--accent)]">{t("alerts.evidence")}</summary>
              <div className="panel-body mt-2"><EvidenceList envelope={envelope} ids={a.evidence_ids.length ? a.evidence_ids : undefined} /></div>
            </details>
          </Surface>
        ))}
      </section>
    </div>
  );
}
