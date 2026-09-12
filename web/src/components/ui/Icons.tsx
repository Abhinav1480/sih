/** Inline SVG icons. Every risk colour on screen is paired with one of these and a word. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number | undefined, rest: SVGProps<SVGSVGElement>) => ({
  width: size ?? 18,
  height: size ?? 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...rest,
});

export const IconCheck = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const IconCaution = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg>
);
export const IconStop = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5Z" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
);
export const IconNeutral = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>
);
export const IconMic = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const IconKeyboard = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>
);
export const IconSun = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IconMoon = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
);
export const IconChevron = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconPin = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconWave = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 18c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" /></svg>
);
export const IconWind = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8a2 2 0 1 1-2 2" /></svg>
);
export const IconClock = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconPlay = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M7 5v14l11-7L7 5Z" /></svg>
);
export const IconSquare = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
);
export const IconUser = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconClose = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconInfo = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);
export const IconLayers = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5M3 17l9 5 9-5" /></svg>
);
export const IconSearch = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconPlus = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconArrow = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconSave = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M5 3h11l3 3v15H5V3Z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></svg>
);
