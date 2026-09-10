/**
 * Design tokens, from the Claude Design file (ORCA Simple v3).
 *
 * Every value here is read off the design, not chosen. The design is a light
 * theme -- a deliberate answer to "readable in direct sunlight on a moving
 * boat" -- and replaces the dark console that preceded it.
 *
 * Two rules the design encodes and this file enforces by shape:
 *
 *   * Every number is set in `font.mono`; every word in `font.sans`. The
 *     sans stack carries the Noto Sans Indic faces so a Telugu string and an
 *     English one share metrics and switching language does not reflow.
 *   * A severity colour is never used alone. `severity` pairs each colour
 *     with the design's own word; call sites add an icon.
 *
 * Elevation is a hairline border and, where the design uses one, a very low
 * translucent shadow (`shadow.card`, 5-7% alpha). There are no drop shadows in
 * the sense of a visible offset.
 */

export const color = {
  /** App and canvas background. */
  page: "#f2f6f7",
  canvas: "#eaeff0",
  /** Card surfaces. */
  card: "#ffffff",
  cardMuted: "#f4f7f8",
  cardTint: "#eef4f6",
  /** Deep-teal header bar and its text. */
  header: "#0a4a59",
  headerText: "#ffffff",
  headerMuted: "#a8ccd6",
  /** The sea-teal accent (buttons, cursor, waveform). */
  sea: "#0b6b7d",
  seaDark: "#0b5563",
  seaTint: "#eaf5f6",
  seaTintBorder: "#cbe2e6",
  /** Map area placeholder. */
  mapTint: "#dfeef3",
  /** Text. */
  ink: "#12303a",
  inkSoft: "#4d6b76",
  inkMuted: "#5a7480",
  inkFaint: "#7d949d",
  inkGhost: "#8aa0a9",
  /** Borders. */
  line: "#dbe6ea",
  lineSoft: "#e4edf0",
  lineFaint: "#eaf0f2",
  lineStrong: "#cfdde2",
  lineBar: "#e2eaed",
  /** Connectivity strip, online. */
  onlineBg: "#e3f3e8",
  onlineBorder: "#c5e2ce",
  onlineText: "#1f7a4c",
  onlineMuted: "#4e7a62",
  /** Safe harbour panel. */
  harbourText: "#155e3a",
  harbourMuted: "#3f7358",
  harbourBorder: "#bfe0cc",
  /** Caution surfaces (the amber family). */
  cautionBg: "#fdf6ea",
  cautionBorder: "#ecd3a3",
  cautionChip: "#d9931b",
  cautionText: "#8a5600",
  cautionSoft: "#8a7350",
  cautionPill: "#f6e3c2",
  cautionLabel: "#a08a63",
  cautionPanel: "#fdf3e2",
  cautionPanelBorder: "#e6c78c",
  cautionPanelText: "#7b5a17",
  cautionHeaderInk: "#3d2600",
  /** Danger surfaces (the red family). */
  dangerBg: "#fdeaea",
  dangerBorder: "#f0c4c4",
  dangerText: "#a51d1d",
  dangerMuted: "#8a4444",
  dangerHeaderMuted: "#ffd9d9",
  /** Modal scrim over a map. */
  scrim: "rgba(18,48,58,.35)",
} as const;

/**
 * The design's severity ramp. Keyed by the band the API sent, via
 * lib/design/verdict.ts -- never by a number.
 */
export const severity = {
  green: { hex: "#1f7a4c", word: "SAFE" },
  amber: { hex: "#d9931b", word: "CAUTION" },
  amberDark: { hex: "#a86a00", word: "CAUTION" },
  orange: { hex: "#d4541f", word: "ROUGH" },
  red: { hex: "#c62828", word: "DO NOT GO" },
} as const;

export const font = {
  /** All interface text. Indic faces in the same stack so scripts swap in place. */
  sans: "Outfit, 'Noto Sans Telugu', 'Noto Sans Tamil', 'Noto Sans Devanagari', system-ui, sans-serif",
  /** Every number, coordinate, unit, timestamp, bearing, score. */
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

/** Type scale, from the design. Weights are Outfit 400/500/600/700. */
export const type = {
  verdictHero: { size: 46, weight: 700, line: 1, tracking: "-.01em" },
  verdictCard: { size: 23, weight: 700, line: 1.05, tracking: "-.01em" },
  narrative: { size: 26, weight: 500, line: 1.5 },
  geoBody: { size: 24, weight: 600, line: 1.4 },
  liveSubtitle: { size: 32, weight: 600, line: 1.35 },
  headerTitle: { size: 18, weight: 600, line: 1 },
  wordmark: { size: 19, weight: 700, line: 1, tracking: ".12em" },
  button: { size: 18, weight: 600, line: 1.2 },
  buttonBig: { size: 19, weight: 700, line: 1.2 },
  body: { size: 15, weight: 400, line: 1.45 },
  bodyStrong: { size: 16, weight: 500, line: 1.2 },
  label: { size: 13, weight: 400, line: 1.3 },
  caption: { size: 12, weight: 500, line: 1 },
  eyebrow: { size: 13, weight: 600, line: 1, tracking: ".06em" },
  /** Mono sizes. */
  statBig: { size: 34, weight: 700, line: 1 },
  stat: { size: 27, weight: 700, line: 1 },
  statSmall: { size: 17, weight: 700, line: 1 },
  score: { size: 26, weight: 700, line: 1 },
  monoLabel: { size: 13, weight: 500, line: 1 },
  monoCaption: { size: 12, weight: 500, line: 1 },
  monoUnit: { size: 11, weight: 500, line: 1 },
} as const;

/** Radii, from the design. */
export const radius = {
  pill: 999,
  card: 20,
  cardSmall: 16,
  panel: 18,
  button: 14,
  chip: 15,
  tile: 13,
  tag: 6,
  bar: 7,
  phone: 34,
} as const;

/**
 * Touch targets. 56 is the floor for anything tappable; 72 for the voice
 * control; the design's own buttons run 56-88.
 */
export const touch = {
  min: 56,
  voice: 72,
  ack: 68,
  contact: 76,
  hold: 88,
  answerAction: 62,
  replay: 60,
  tab: 58,
} as const;

export const shadow = {
  card: "0 1px 2px rgba(18,48,58,.05)",
  panel: "0 2px 8px rgba(18,48,58,.06)",
  phone: "0 6px 24px rgba(18,48,58,.07)",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

/** Layout constants from the design frame. */
export const layout = {
  width: 390,
  statusBar: 40,
  connectivityStrip: 38,
  tabBar: 70,
  mapMin: 250,
} as const;

/** Keyframes the design declares. Inject once in the app shell. */
export const keyframes = `
@keyframes orca-wv{0%,100%{transform:scaleY(.22)}50%{transform:scaleY(1)}}
@keyframes orca-soft{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes orca-up{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
`;
