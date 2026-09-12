"use client";

/**
 * Trips: saved trips, history and a detail view. A trip records where, when,
 * what the conditions were and what ORCA advised, all copied from the
 * envelope it was saved from. Stored in this browser; the page says so.
 */
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useNow } from "@/lib/storage";
import { useFmt, useT } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { deleteTrip, useTrips, type Trip } from "@/lib/store/trips";
import { BandChip, EmptyState, KV, Mono, StatusChip, Surface, TierChip, Unavailable, VerdictChip } from "@/components/ui";
import { IconArrow } from "@/components/ui/Icons";

export function TripsPage() {
  const t = useT();
  const f = useFmt();
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const list = useTrips(session.user?.id ?? null);
  const now = useNow();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? params.get("id");
  const setSelected = setPicked;

  const { upcoming, history } = useMemo(() => {
    const up: Trip[] = [], hist: Trip[] = [];
    for (const tr of list) (new Date(tr.when.start_time).getTime() >= now ? up : hist).push(tr);
    return { upcoming: up, history: hist };
  }, [list, now]);

  const detail = list.find((x: Trip) => x.id === selected) ?? null;

  if (session.status !== "signed_in") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("trips.title")}</h1>
        <EmptyState title={t("trips.needAccount")} body={t("auth.guestNote")} action={<Link href="/signin" className="btn btn-primary">{t("auth.signin")}</Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("trips.title")}</h1>
        <p className="text-xs text-text-3">{t("trips.local")}</p>
      </div>
      {list.length === 0 && <EmptyState title={t("trips.empty")} body={t("trips.emptyHint")} action={<Link href="/ai" className="btn btn-primary">{t("nav.ai")}</Link>} />}
      {list.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-4">
            <TripList title={t("trips.upcoming")} trips={upcoming} selected={selected} onPick={setSelected} />
            <TripList title={t("trips.history")} trips={history} selected={selected} onPick={setSelected} />
          </div>
          <Surface className="p-5">
            {!detail && <EmptyState title={t("trips.detail")} />}
            {detail && (
              <div className="space-y-4 arrive">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{f.raw(detail.where.name)}</h2>
                  <div className="flex gap-2">
                    {detail.conversation_id && <button type="button" className="btn btn-sm" onClick={() => router.push("/ai")}>{t("trips.reopen")} <IconArrow size={14} /></button>}
                    <button type="button" className="btn btn-sm btn-quiet" onClick={() => { deleteTrip(detail.id); setSelected(null); }}>{t("common.delete")}</button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictChip verdict={detail.verdict} />
                  {detail.band && <BandChip band={detail.band} />}
                  {detail.score !== null && <Mono className="text-sm text-text-2">{f.int(detail.score)} / 100</Mono>}
                </div>
                <div>
                  <div className="eyebrow mb-1">{t("trips.where")}</div>
                  <KV label={t("common.location")} mono={false}>{f.raw(detail.where.name)}</KV>
                  <KV label={t("common.coordinates")}>{f.coord(detail.where.latitude, "lat")} {f.coord(detail.where.longitude, "lon")}</KV>
                </div>
                <div>
                  <div className="eyebrow mb-1">{t("trips.when")}</div>
                  <KV label={t("common.window")} mono={false}>{f.raw(detail.when.label)}</KV>
                  <KV label={t("common.validFrom")}>{f.dateTime(detail.when.start_time)}</KV>
                  <KV label={t("common.validUntil")}>{f.dateTime(detail.when.end_time)}</KV>
                  <KV label={t("trips.saved")}>{f.dateTime(detail.saved_at)}</KV>
                </div>
                <div>
                  <div className="eyebrow mb-1">{t("trips.conditions")}</div>
                  <Cond label={t("answer.wave")} v={detail.wave} />
                  <Cond label={t("answer.wind")} v={detail.wind} />
                </div>
                <div>
                  <div className="eyebrow mb-1">{t("trips.advised")}</div>
                  <p className="font-semibold">{f.raw(detail.headline)}</p>
                  {detail.advised ? <p className="mt-1 text-sm text-text-2">{f.raw(detail.advised)}</p> : <p className="mt-1 text-sm"><Unavailable /></p>}
                  <p className="mt-2 text-xs text-text-3">{t("trips.question")}: “{detail.query}” · <Mono>{detail.request_id}</Mono></p>
                </div>
              </div>
            )}
          </Surface>
        </div>
      )}
    </div>
  );
}

function Cond({ label, v }: { label: string; v: Trip["wave"] }) {
  const f = useFmt();
  return (
    <KV label={label} mono={false}>
      {v ? (
        <span className="flex flex-wrap items-center justify-end gap-1"><Mono>{f.raw(v.value)} {v.unit}</Mono><TierChip tier={v.provider_tier} /><StatusChip status={v.status} /></span>
      ) : <Unavailable />}
    </KV>
  );
}

function TripList({ title, trips, selected, onPick }: { title: string; trips: Trip[]; selected: string | null; onPick: (id: string) => void }) {
  const t = useT();
  const f = useFmt();
  return (
    <Surface className="p-4">
      <div className="eyebrow mb-2">{title}</div>
      {trips.length === 0 && <p className="text-sm text-text-2">{t("common.none")}</p>}
      <ul className="space-y-1">
        {trips.map((tr) => (
          <li key={tr.id}>
            <button type="button" className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm hover:bg-[var(--accent-tint)] ${tr.id === selected ? "bg-[var(--accent-tint)]" : ""}`} onClick={() => onPick(tr.id)} aria-pressed={tr.id === selected}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{f.raw(tr.where.name)}</span>
                <span className="block text-xs text-text-3">{f.raw(tr.when.label)} · <Mono>{f.dateTime(tr.when.start_time)}</Mono></span>
              </span>
              <VerdictChip verdict={tr.verdict} />
            </button>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
