"use client";

/**
 * The design's building blocks, in code.
 *
 * Every value here traces to ORCA Simple v3. Two rules are enforced by
 * construction rather than by convention:
 *
 *   * Numbers go through <Num>, which sets the monospace face. A measurement
 *     rendered any other way is a bug.
 *   * A severity colour never appears without a word and an icon. <Severity>
 *     takes all three.
 *
 * Nothing in this file decides anything about the sea. It renders what it is
 * given, and a value it is not given renders as "Not measured".
 */

import React from "react";
import { color, font, radius, shadow, touch } from "@/lib/design/tokens";
import type { BandIcon } from "@/lib/design/verdict";
import { TIER_STYLE, tierWord } from "@/lib/design/verdict";
import { type LangCode } from "@/lib/i18n/app";
import { notMeasured } from "@/lib/i18n/digits";

export const sans = (size: number, weight: number, line = 1.2, tracking?: string): React.CSSProperties => ({
  fontFamily: font.sans,
  fontSize: size,
  fontWeight: weight,
  lineHeight: line,
  letterSpacing: tracking,
});

export const mono = (size: number, weight: number, line = 1): React.CSSProperties => ({
  fontFamily: font.mono,
  fontSize: size,
  fontWeight: weight,
  lineHeight: line,
  fontVariantNumeric: "tabular-nums",
});

/** A number, always monospace. Pass already-localised text. */
export function Num({
  children, size = 17, weight = 700, color: c = color.ink, style,
}: { children: React.ReactNode; size?: number; weight?: number; color?: string; style?: React.CSSProperties }) {
  return <span className="num" style={{ ...mono(size, weight), color: c, ...style }}>{children}</span>;
}

/** An SVG icon from the design's line set. */
export function Icon({ name, size = 24, color: c = "currentColor", stroke = 2.2 }: {
  name: "check" | "alert" | "stop" | "unknown" | "mic" | "wave" | "wind" | "clock" | "back" | "chevron" | "speaker" | "map" | "pin" | "phone" | "boat" | "globe" | "save" | "list" | "help";
  size?: number; color?: string; stroke?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    check: <path d="m4 12.5 5 5 11-11" />,
    alert: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 10v5" /><path d="M12 18h.01" /></>,
    stop: <><circle cx="12" cy="12" r="9" /><path d="M8 8l8 8M16 8l-8 8" /></>,
    unknown: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><path d="M12 17h.01" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>,
    wave: <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />,
    wind: <><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 14h14a3 3 0 1 1-3 3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    back: <path d="m15 6-6 6 6 6" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    speaker: <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="M16 9a4 4 0 0 1 0 6" /></>,
    map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14M15 6v14" /></>,
    pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
    boat: <><path d="M3 15h18l-2 4H5l-2-4Z" /><path d="M6 15V9h12v6" /><path d="M12 9V4l5 5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    save: <><path d="M5 3h11l3 3v15H5V3Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><path d="M12 17h.01" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none" }}>
      {paths[name]}
    </svg>
  );
}

const bandIconName = (icon: BandIcon) => (icon === "unknown" ? "help" : icon);

/** Colour + word + icon, always together. */
export function Severity({ hex, word, icon, size = 23 }: { hex: string; word: string; icon: BandIcon; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: hex }}>
      <Icon name={bandIconName(icon)} size={size + 4} color={hex} stroke={2.4} />
      <span style={sans(size, 700, 1.05, "-.01em")}>{word}</span>
    </span>
  );
}

/** The deep-teal header bar. */
export function Header({ title, onBack, right, tall }: {
  title: React.ReactNode; onBack?: () => void; right?: React.ReactNode; tall?: boolean;
}) {
  return (
    <div style={{ flex: "none", background: color.header, padding: tall ? "12px 16px" : "13px 16px", display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
      {onBack && (
        <button onClick={onBack} aria-label="back" style={{ ...btnReset, minWidth: touch.min, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", margin: "-8px -8px -8px -12px" }}>
          <Icon name="back" size={26} color={color.headerText} stroke={2.4} />
        </button>
      )}
      <span style={{ ...sans(18, 600, 1), color: color.headerText, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
      {right}
    </div>
  );
}

export const btnReset: React.CSSProperties = { border: "none", background: "transparent", padding: 0, cursor: "pointer", font: "inherit", color: "inherit" };

/** A card in the design's white-with-hairline style. */
export function Card({ children, style, tone }: { children: React.ReactNode; style?: React.CSSProperties; tone?: "caution" | "danger" | "safe" }) {
  const tones = {
    caution: { background: color.cautionBg, borderColor: color.cautionBorder },
    danger: { background: color.dangerBg, borderColor: color.dangerBorder },
    safe: { background: color.onlineBg, borderColor: color.harbourBorder },
  };
  return (
    <div style={{ border: `1px solid ${color.lineSoft}`, borderRadius: radius.card, boxShadow: shadow.card, padding: 14, ...(tone ? tones[tone] : { background: color.card }), ...style }}>
      {children}
    </div>
  );
}

/** A large primary action, 56px minimum. */
export function BigButton({ children, onClick, variant = "outline", minHeight = touch.min, icon, trailing, style, disabled }: {
  children: React.ReactNode; onClick?: () => void; variant?: "outline" | "sea" | "danger" | "tint";
  minHeight?: number; icon?: React.ReactNode; trailing?: React.ReactNode; style?: React.CSSProperties; disabled?: boolean;
}) {
  const v = {
    outline: { background: color.card, color: color.ink, border: `1px solid ${color.lineStrong}` },
    sea: { background: color.sea, color: color.headerText, border: "none" },
    danger: { background: severityRed, color: color.headerText, border: "none" },
    tint: { background: color.seaTint, color: color.seaDark, border: `1px solid ${color.seaTintBorder}` },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...btnReset, ...v, width: "100%", minHeight, borderRadius: radius.button, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", textAlign: "left", opacity: disabled ? 0.5 : 1, ...style }}>
      {icon}
      <span style={{ ...sans(18, variant === "outline" ? 600 : 700, 1.2), flex: 1, minWidth: 0 }}>{children}</span>
      {trailing}
    </button>
  );
}
const severityRed = "#c62828";

/** A stat tile: big mono value, mono unit, sans label. */
export function StatTile({ value, unit, label, hex = color.ink, icon }: {
  value: string; unit: string; label: string; hex?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, border: `1px solid ${color.lineSoft}`, borderRadius: radius.panel, background: color.card, boxShadow: shadow.card, padding: "14px 10px" }}>
      {icon}
      <div style={{ ...mono(27, 700), color: hex, marginTop: icon ? 9 : 0, overflowWrap: "anywhere" }}>{value}</div>
      <div style={{ ...mono(12, 500), color: color.inkFaint, marginTop: 4 }}>{unit}</div>
      <div style={{ ...sans(13, 400, 1.25), color: color.inkSoft, marginTop: 8 }}>{label}</div>
    </div>
  );
}

/**
 * A provenance badge, rendered from `provider_tier` exactly as sent.
 * ISRO is visually distinct; nothing is upgraded; an unknown tier shows
 * "source unavailable" in the design's muted style.
 */
export function TierBadge({ tier, lang, sourceUnavailableLabel }: { tier: string | null | undefined; lang: LangCode; sourceUnavailableLabel: string }) {
  const word = tierWord(tier, lang);
  const st = tier ? TIER_STYLE[tier] : undefined;
  if (!word || !st) {
    return <span style={{ ...sans(11, 600, 1, ".06em"), padding: "5px 8px", borderRadius: radius.tag, color: color.inkFaint, background: color.cardMuted, border: `1px solid ${color.lineSoft}`, fontStyle: "italic" }}>{sourceUnavailableLabel}</span>;
  }
  return <span style={{ ...sans(11, 600, 1, ".06em"), padding: "5px 8px", borderRadius: radius.tag, color: st.hex, background: st.bg, border: `1px solid ${st.border}`, whiteSpace: "nowrap" }}>{word}</span>;
}

/** The connectivity strip under the header. */
export function ConnectivityStrip({ online, label, right, stale }: { online: boolean; label: string; right?: React.ReactNode; stale?: boolean }) {
  const bg = stale ? color.dangerBg : online ? color.onlineBg : color.cautionBg;
  const border = stale ? color.dangerBorder : online ? color.onlineBorder : color.cautionBorder;
  const fg = stale ? color.dangerText : online ? color.onlineText : color.cautionText;
  return (
    <div role="status" style={{ flex: "none", minHeight: 38, display: "flex", alignItems: "center", gap: 9, padding: "0 16px", background: bg, borderBottom: `1px solid ${border}` }}>
      <Icon name={online && !stale ? "check" : "alert"} size={16} color={fg} stroke={2.4} />
      <span style={{ ...sans(14, 600, 1), color: fg }}>{label}</span>
      <span style={{ marginLeft: "auto", ...sans(13, 500, 1), color: fg, opacity: 0.85 }}>{right}</span>
    </div>
  );
}

/** Full-height screen column. */
export function Screen({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: color.page, ...style }}>{children}</div>;
}

/** Scrollable body with the design's 18px gutter. */
export function Body({ children, pad = 18, style }: { children: React.ReactNode; pad?: number; style?: React.CSSProperties }) {
  // .orca-body > * { flex: none } in globals.css: flex children otherwise shrink to fit a scrolling parent and clip cards.
  return <div className="orca-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `${pad}px ${pad}px 24px`, display: "flex", flexDirection: "column", gap: 12, ...style }}>{children}</div>;
}

/** "Not measured" in the reader's language, styled as a value that is absent. */
export function Unavailable({ lang }: { lang: LangCode }) {
  return <span style={{ ...sans(14, 400, 1), color: color.inkFaint, fontStyle: "italic" }}>{notMeasured(lang)}</span>;
}

/** A defined empty / error state, so no screen can be blank. */
export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 10, padding: "40px 24px", flex: 1 }}>
      {icon}
      <div style={{ ...sans(20, 600, 1.3), color: color.ink }}>{title}</div>
      {body && <div style={{ ...sans(15, 400, 1.45), color: color.inkMuted, maxWidth: 300 }}>{body}</div>}
      {action && <div style={{ marginTop: 8, width: "100%", maxWidth: 320 }}>{action}</div>}
    </div>
  );
}
