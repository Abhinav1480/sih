"use client";

/**
 * The agent trace, one row per event, SKIPPED rows kept visible because they
 * name which source was unavailable and why. Built against the TraceEvent
 * shape, which is also what the SSE stream emits, so a live stream and a
 * recorded response render through the same rows.
 */
import { useFmt, useT } from "@/lib/i18n";
import type { TraceEvent } from "@/lib/types";
import { Mono } from "@/components/ui";

export function TraceRows({ events, live = false }: { events: TraceEvent[]; live?: boolean }) {
  const t = useT();
  const f = useFmt();
  if (events.length === 0) return <p className="text-sm text-text-2">{t("trace.waiting")}</p>;
  return (
    <ol className="space-y-1.5">
      {events.map((e, i) => {
        const skipped = e.status === "SKIPPED";
        const failed = e.status === "FAILED" || e.stage === "error";
        return (
          <li key={`${e.seq}-${i}`} className={`surface-2 flex gap-3 px-3 py-2 text-sm ${live ? "arrive" : ""}`}>
            <Mono className="w-6 shrink-0 text-xs text-text-3">{f.int(e.seq)}</Mono>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{e.agent}</span>
                <span className={`chip ${skipped ? "chip-muted" : failed ? "risk-SEVERE" : "risk-LOW"}`}>
                  {e.status === "COMPLETED" ? t("trace.status.COMPLETED") : skipped ? t("trace.status.SKIPPED") : failed ? t("trace.status.FAILED") : e.status}
                </span>
                {e.tool && <Mono className="text-xs text-text-3">{e.tool}</Mono>}
                <Mono className="ml-auto text-xs text-text-3">{f.int(e.duration_ms)} ms</Mono>
              </div>
              <div className={`mt-0.5 ${skipped ? "text-text-2" : ""}`}>{f.raw(e.action)}</div>
              {e.detail && <div className="mt-0.5 text-xs text-text-3 break-words">{f.raw(e.detail)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
