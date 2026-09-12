"use client";

/**
 * Why: the risk gauge, stacked factor bars with `points_added`, a visible
 * sum line proving the arithmetic, the triggered rules, the feeds that did
 * not answer, and the engine's own data-quality sentence. The browser draws
 * the numbers it was given and adds them up in front of the reader; it never
 * produces one.
 */
import { useFmt, useT } from "@/lib/i18n";
import type { RiskBlock } from "@/lib/types";
import { BandChip, Mono, bandClass } from "@/components/ui";
import { IconCaution } from "@/components/ui/Icons";

export function Gauge({ score, band }: { score: number; band: string }) {
  const f = useFmt();
  const t = useT();
  const cls = bandClass(band);
  // Half ring: 0 at the left, 100 at the right. Pure geometry from the score sent.
  const r = 44, cx = 56, cy = 56;
  // Geometry only: the fraction of the half ring the engine's score fills.
  const frac = Math.min(1, Math.max(0, score / 100));
  const angle = Math.PI * (1 - frac);
  const ex = cx + r * Math.cos(angle), ey = cy - r * Math.sin(angle);
  const sweep = angle < Math.PI / 2 ? 1 : 0;
  return (
    <svg viewBox="0 0 112 64" className="h-20 w-36" role="img" aria-label={`${t("answer.score")} ${f.int(score)} ${t("answer.outOf")}`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--hairline)" strokeWidth="10" strokeLinecap="round" />
      {frac !== 0 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${sweep} 1 ${ex} ${ey}`} fill="none" strokeWidth="10" strokeLinecap="round" style={{ stroke: `var(--risk-${cls.toLowerCase()})` }} />}
      <text x={cx} y={cy - 4} textAnchor="middle" className="mono" fontSize="22" fontWeight="700" fill="currentColor">{f.int(score)}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="var(--text-3)">/ 100</text>
    </svg>
  );
}

export function WhyPanel({ risk }: { risk: RiskBlock | null }) {
  const t = useT();
  const f = useFmt();
  if (!risk) return <p className="text-sm text-text-2">{t("answer.noRisk")}</p>;
  const sum = risk.factors.reduce((a, x) => a + x.points_added, 0);
  const cls = bandClass(risk.band);
  const total = risk.score === 0 ? 1 : risk.score;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Gauge score={risk.score} band={risk.band} />
        <div>
          <BandChip band={risk.band} />
          <p className="mt-1 text-sm text-text-2">{t("common.confidence")}: <Mono>{f.int(risk.confidence)}%</Mono></p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex h-3 w-full overflow-hidden rounded-full bg-[var(--hairline-2)]" aria-hidden>
          {risk.factors.map((x, i) => (
            <div key={i} className={`bar-${cls} h-full border-r border-[var(--bg)] last:border-0`} style={{ width: `${(x.points_added / total) * 100}%`, opacity: 1 - i * 0.18 }} />
          ))}
        </div>
        <ul className="divide-y divide-[var(--hairline)] text-sm">
          {risk.factors.map((x, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2">
              <div>
                <div className="font-medium">{x.name}</div>
                <div className="text-xs text-text-3">{f.raw(x.description)}</div>
              </div>
              <div className="shrink-0 text-right">
                <Mono className="block">{f.raw(x.value)}</Mono>
                <Mono className={`block text-xs ink-${cls}`}>+{f.int(x.points_added)} {t("answer.points")}</Mono>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between py-2 font-semibold">
            <span>{t("answer.sum")}</span>
            <Mono>{risk.factors.map((x) => f.int(x.points_added)).join(" + ")} = {f.int(sum)}</Mono>
          </li>
        </ul>
        {sum !== risk.score && (
          <p className="mt-2 flex items-start gap-2 text-sm ink-HIGH"><IconCaution size={16} className="mt-0.5 shrink-0" />{t("answer.sumMismatch")}</p>
        )}
      </div>

      <div>
        <div className="eyebrow mb-1">{t("answer.rules")}</div>
        {risk.triggered_rules.length === 0 && <p className="text-sm text-text-3">{t("answer.noRules")}</p>}
        <ul className="space-y-1 text-sm">
          {risk.triggered_rules.map((r, i) => (
            <li key={i} className="flex gap-2"><IconCaution size={14} className="mt-1 shrink-0 ink-MODERATE" /><span>{f.raw(r)}</span></li>
          ))}
        </ul>
      </div>

      {risk.missing_inputs.length > 0 && (
        <div>
          <div className="eyebrow mb-1">{t("answer.missingInputs")}</div>
          <ul className="flex flex-wrap gap-1">{risk.missing_inputs.map((m, i) => <li key={i} className="chip chip-muted">{m}</li>)}</ul>
        </div>
      )}

      <div>
        <div className="eyebrow mb-1">{t("answer.dataQuality")}</div>
        <p className="text-sm text-text-2">{f.raw(risk.data_quality)}</p>
      </div>
    </div>
  );
}
