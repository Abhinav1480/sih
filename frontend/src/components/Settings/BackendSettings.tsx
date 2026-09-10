"use client";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { useBackendConfig, pingBackend, type BackendMode } from "@/lib/backend/config";
import { FALLBACK_SAVED_AT } from "@/lib/backend/fallbackResponse";
import { loadLastResponse } from "@/lib/offline/store";

// ponytail: local age formatter so this file does not depend on Track D's formatAge.
function formatAge(iso: string, lang: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return t("backend.age.now", lang);
  if (mins < 60) return t("backend.age.min", lang, { n: mins });
  if (mins < 60 * 24) return t("backend.age.hr", lang, { n: Math.round(mins / 60) });
  return t("backend.age.day", lang, { n: Math.round(mins / 1440) });
}

const CHIP_COLOR: Record<BackendMode, string> = {
  local: "text-calm border-calm/40 bg-calm/10",
  deployed: "text-accent border-accent/40 bg-accent/10",
  cached: "text-caution border-caution/40 bg-caution/10",
};

export function BackendModeChip({ lang, onClick }: { lang: string; onClick?: () => void }) {
  const { config } = useBackendConfig();
  return (
    <button
      type="button"
      onClick={onClick}
      title={t("backend.title", lang)}
      className={`num rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wider ${CHIP_COLOR[config.mode]}`}
    >
      {t(`backend.chip.${config.mode}`, lang)}
    </button>
  );
}

type Ping = { state: "idle" } | { state: "testing" } | { state: "done"; ok: boolean; ms: number; detail?: string };

function UrlRow({ lang, value, onChange }: { lang: string; value: string; onChange: (v: string) => void }) {
  const [ping, setPing] = useState<Ping>({ state: "idle" });
  const test = async () => {
    setPing({ state: "testing" });
    setPing({ state: "done", ...(await pingBackend(value)) });
  };
  return (
    <div className="mt-2 flex flex-col gap-2 pl-9">
      <label className="text-[11px] uppercase tracking-wider text-muted">{t("backend.url.label", lang)}</label>
      <input
        type="url"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="num h-11 w-full rounded-md border border-border-base bg-base px-3 text-sm text-text outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={test}
          disabled={ping.state === "testing"}
          className="h-10 rounded-md border border-border-strong px-3 text-sm text-text disabled:opacity-50"
        >
          {ping.state === "testing" ? t("backend.testing", lang) : t("backend.test", lang)}
        </button>
        {ping.state === "done" && (
          <span className={`num text-xs ${ping.ok ? "text-calm" : "text-severe"}`}>
            {ping.ok
              ? t("backend.ok", lang, { ms: ping.ms })
              : t("backend.fail", lang, { detail: ping.detail ?? "" })}
          </span>
        )}
      </div>
    </div>
  );
}

const MODES: BackendMode[] = ["local", "deployed", "cached"];

export default function BackendSettings({ lang, onClose }: { lang: string; onClose?: () => void }) {
  const { config, setConfig } = useBackendConfig();
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  useEffect(() => {
    loadLastResponse().then((c) => setLastSavedAt(c?.savedAt ?? null));
  }, []);

  const cachedLine = lastSavedAt
    ? t("backend.cached.last", lang, { age: formatAge(lastSavedAt, lang) })
    : t("backend.cached.bundled", lang, { age: formatAge(FALLBACK_SAVED_AT, lang) });

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-base bg-panel p-4 text-text">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{t("backend.title", lang)}</h2>
          <p className="text-xs text-muted">{t("backend.subtitle", lang)}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t("backend.close", lang)} className="h-10 w-10 text-muted">
            ✕
          </button>
        )}
      </header>

      <div role="radiogroup" className="flex flex-col gap-2">
        {MODES.map((m) => {
          const selected = config.mode === m;
          return (
            <div key={m} className={`rounded-md border p-2 ${selected ? "border-accent bg-raised" : "border-border-base"}`}>
              <label className="flex h-14 cursor-pointer items-center gap-3 px-2">
                <input
                  type="radio"
                  name="backend-mode"
                  value={m}
                  checked={selected}
                  onChange={() => setConfig({ ...config, mode: m })}
                  className="h-5 w-5 accent-[#38e8d0]"
                />
                <span className="flex flex-col">
                  <span className="text-base font-semibold">{t(`backend.mode.${m}`, lang)}</span>
                  <span className="text-xs text-muted">
                    {m === "cached" ? cachedLine : t(`backend.mode.${m}.desc`, lang)}
                  </span>
                </span>
              </label>
              {m === "local" && (
                <>
                  <UrlRow lang={lang} value={config.localUrl} onChange={(v) => setConfig({ ...config, localUrl: v })} />
                  <p className="px-2 pb-1 text-[11px] leading-snug text-muted">
                    {t("backend.local.hint", lang)}{" "}
                    <code className="num text-text">ipconfig</code> · <code className="num text-text">ip addr</code>
                    {" · "}
                    <code className="num text-text">uvicorn app.main:app --host 0.0.0.0 --port 8001</code>
                  </p>
                </>
              )}
              {m === "deployed" && (
                <UrlRow lang={lang} value={config.deployedUrl} onChange={(v) => setConfig({ ...config, deployedUrl: v })} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
