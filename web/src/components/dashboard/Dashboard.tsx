"use client";

/**
 * The dashboard: a greeting by name, today's conditions for the saved home
 * harbour from a real fetch, the person's own details, active alerts with an
 * honest empty state, quick asks, the next saved trip, and one line naming
 * when ORCA last synced and which tiers the data came from. Every card leads
 * somewhere. Nothing on it is a value ORCA did not return.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useNow } from "@/lib/storage";
import { useFmt, useT, type StringKey } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { useHomeConditions, useHomeLocation } from "@/lib/store/home";
import { useConversations, type Conversation } from "@/lib/store/conversations";
import { useTrips } from "@/lib/store/trips";
import { fetchAlerts, ApiError } from "@/lib/api/client";
import type { AlertBulletin } from "@/lib/types";
import { evidenceMatching } from "@/lib/types";
import { KeyNumber, VerdictBlock } from "@/components/answer/AnswerPanel";
import { EmptyState, ErrorState, KV, Mono, SeverityChip, Skeleton, Surface, TierChip, Unavailable, VerdictChip } from "@/components/ui";
import { IconArrow } from "@/components/ui/Icons";
import { apiErrorText } from "@/components/ai/OrcaAI";

const QUICK_ASKS: StringKey[] = ["dash.ask.safe", "dash.ask.pfz", "dash.ask.conditions", "dash.ask.route"];

function greetingKey(): StringKey {
  const h = new Date().getHours();
  return h < 12 ? "dash.greeting.morning" : h < 17 ? "dash.greeting.afternoon" : "dash.greeting.evening";
}

export function Dashboard() {
  const t = useT();
  const f = useFmt();
  const router = useRouter();
  const session = useSession();
  const home = useHomeLocation();
  const cond = useHomeConditions();
  const conversations = useConversations();
  const trips = useTrips(session.user?.id ?? null);
  const now = useNow();
  const [alertResult, setAlertResult] = useState<{ key: string; alerts: AlertBulletin[] | null; error: string | null } | null>(null);
  const alertKey = home ? `${home.latitude},${home.longitude}` : "none";
  const alerts = alertResult?.key === alertKey ? alertResult.alerts : null;
  const alertsError = alertResult?.key === alertKey ? alertResult.error : null;

  useEffect(() => {
    let cancelled = false;
    fetchAlerts(home ? { latitude: home.latitude, longitude: home.longitude } : null)
      .then((a) => { if (!cancelled) setAlertResult({ key: alertKey, alerts: a, error: null }); })
      .catch((e) => { if (!cancelled) setAlertResult({ key: alertKey, alerts: null, error: e instanceof ApiError ? e.code : "network" }); });
    return () => { cancelled = true; };
  }, [alertKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = session.name ?? t("common.guest");
  const wave = cond.envelope ? evidenceMatching(cond.envelope, /wave height/i) : null;
  const wind = cond.envelope ? evidenceMatching(cond.envelope, /wind/i) : null;
  const tiers = useMemo(() => (cond.envelope ? Array.from(new Set(cond.envelope.evidence.map((e) => e.provider_tier))) : []), [cond.envelope]);
  const nextTrip = trips.find((tr) => new Date(tr.when.start_time).getTime() >= now) ?? trips[0] ?? null;
  const recent = conversations.slice(0, 4);

  const askQuick = (q: string) => {
    try { sessionStorage.setItem("orca.ai.pending", q); } catch { /* fine */ }
    router.push("/ai");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t(greetingKey(), { name })}</h1>
        <p className="mt-1 text-text-2">{home ? t("dash.today", { place: home.name }) : t("dash.noHome")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* --------------------------------------------------- today */}
        <Surface className="p-5">
          {cond.state === "no_home" && (
            <EmptyState title={t("dash.noHome")} action={<Link href="/profile" className="btn btn-primary">{t("dash.setHome")}</Link>} />
          )}
          {cond.state === "loading" && (
            <div className="space-y-3" aria-busy="true"><Skeleton className="h-24 w-full" /><div className="grid grid-cols-3 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div></div>
          )}
          {cond.state === "error" && <ErrorState title={t("dash.conditionsFailed")} body={apiErrorText(t, cond.error ?? "network")} onRetry={cond.refresh} />}
          {cond.state === "ready" && cond.envelope && (
            <div className="space-y-4 arrive">
              <VerdictBlock envelope={cond.envelope} />
              <div className="grid gap-3 sm:grid-cols-3">
                <KeyNumber label={t("answer.wave")} value={wave ? wave.value : null} unit={wave?.unit} tier={wave?.provider_tier} status={wave?.status} note={wave ? f.raw(wave.observation_or_forecast_time) : undefined} />
                <KeyNumber label={t("answer.wind")} value={wind ? wind.value : null} unit={wind?.unit} tier={wind?.provider_tier} status={wind?.status} note={wind ? f.raw(wind.observation_or_forecast_time) : undefined} />
                <KeyNumber label={t("common.updated")} value={cond.fetchedAt ? f.dateTime(cond.fetchedAt) : null} note={cond.capturedQuestion ? `${t("common.recorded")}: ${f.raw(cond.capturedQuestion)}` : undefined} />
              </div>
              <div className="flex justify-end">
                <Link href="/ai" className="btn btn-sm">{t("dash.askAbout")} <IconArrow size={14} /></Link>
              </div>
            </div>
          )}
        </Surface>

        {/* --------------------------------------------------- details */}
        <Surface className="p-5">
          <div className="eyebrow mb-2">{t("dash.details")}</div>
          <KV label={t("dash.harbour")} mono={false}>{home ? home.name : <Unavailable />}</KV>
          <KV label={t("profile.lat")}>{home ? f.coord(home.latitude, "lat") : <Unavailable />}</KV>
          <KV label={t("profile.lon")}>{home ? f.coord(home.longitude, "lon") : <Unavailable />}</KV>
          <KV label={t("dash.vessel")} mono={false}>{session.profile.vessel?.name ? session.profile.vessel.name : <Unavailable />}</KV>
          <KV label={t("dash.vesselType")} mono={false}>{session.profile.vessel?.type ? session.profile.vessel.type : <Unavailable />}</KV>
          <div className="mt-3 flex justify-end"><Link href="/profile" className="btn btn-sm btn-quiet">{t("nav.profile")} <IconArrow size={14} /></Link></div>
          <div className="mt-4 border-t border-hairline pt-4">
            <div className="eyebrow mb-2">{t("dash.recent")}</div>
            {recent.length === 0 && <p className="text-sm text-text-2">{t("dash.recentEmpty")}</p>}
            <ul className="space-y-1">
              {recent.map((c: Conversation) => {
                const last = [...c.turns].reverse().find((x) => x.envelope);
                return (
                  <li key={c.id}>
                    <Link href="/ai" className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm hover:bg-[var(--accent-tint)]" onClick={() => { try { sessionStorage.setItem("orca.conversation.current", c.id); } catch { /* fine */ } }}>
                      <span className="truncate">{c.title}</span>
                      {last?.envelope ? <VerdictChip verdict={last.envelope.answer.verdict} /> : <Mono className="text-xs text-text-3">{f.relative(c.updated_at)}</Mono>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Surface>

        {/* --------------------------------------------------- alerts */}
        <Surface className="p-5">
          <div className="mb-2 flex items-center justify-between"><div className="eyebrow">{t("dash.alerts")}</div><Link href="/alerts" className="text-sm text-[var(--accent)]">{t("nav.alerts")}</Link></div>
          {alerts === null && !alertsError && <Skeleton className="h-16 w-full" />}
          {alertsError && <ErrorState title={t("alerts.failed")} body={apiErrorText(t, alertsError)} />}
          {alerts && alerts.length === 0 && <EmptyState title={t("dash.alertsEmpty")} />}
          {alerts && alerts.length > 0 && (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.alert_id} className="surface-2 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><SeverityChip severity={a.severity} /><span className="font-semibold">{a.title}</span><TierChip tier={a.provider_tier} /></div>
                  <p className="mt-1 text-text-2">{f.raw(a.description)}</p>
                  <p className="mt-1 text-xs text-text-3">{t("common.source")}: {a.source} · {t("alerts.issued")}: <Mono>{f.dateTime(a.issued_at)}</Mono></p>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        {/* --------------------------------------------------- quick asks + trip */}
        <div className="space-y-6">
          <Surface className="p-5">
            <div className="eyebrow mb-2">{t("dash.quickAsks")}</div>
            <ul className="space-y-1">
              {QUICK_ASKS.map((k) => (
                <li key={k}>
                  <button type="button" className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm hover:bg-[var(--accent-tint)]" onClick={() => askQuick(t(k))}>
                    <span>{t(k)}</span><IconArrow size={14} className="shrink-0 text-[var(--accent)]" />
                  </button>
                </li>
              ))}
            </ul>
          </Surface>
          <Surface className="p-5">
            <div className="eyebrow mb-2">{t("dash.nextTrip")}</div>
            {!nextTrip && <p className="text-sm text-text-2">{session.status === "signed_in" ? t("dash.noTrip") : t("trips.needAccount")}</p>}
            {nextTrip && (
              <div className="text-sm">
                <div className="font-semibold">{f.raw(nextTrip.where.name)}</div>
                <div className="text-text-2">{f.raw(nextTrip.when.label)} · <Mono>{f.dateTime(nextTrip.when.start_time)}</Mono></div>
                <div className="mt-1"><VerdictChip verdict={nextTrip.verdict} /></div>
                <Link href={`/trips?id=${nextTrip.id}`} className="btn btn-sm mt-3">{t("dash.resume")} <IconArrow size={14} /></Link>
              </div>
            )}
          </Surface>
        </div>
      </div>

      {/* --------------------------------------------------- freshness line */}
      <p className="text-sm text-text-2">
        <span className="eyebrow mr-2">{t("dash.freshness")}</span>
        {cond.fetchedAt ? (
          <>
            {t("dash.synced", { time: f.dateTime(cond.fetchedAt) })}
            {tiers.length > 0 && <> · {t("dash.tierLine", { tiers: "" })}{tiers.map((x) => <TierChip key={x} tier={x} className="ml-1" />)}</>}
            {cond.envelope?.meta.mode === "DEMO" && <> · {t("answer.mode.DEMO")}</>}
          </>
        ) : t("dash.notSynced")}
      </p>
    </div>
  );
}
