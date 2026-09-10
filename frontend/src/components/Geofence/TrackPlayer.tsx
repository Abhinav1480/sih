"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { t } from "@/lib/i18n";
import { DEMO_TRACK } from "@/lib/geofence";

interface TrackPlayerProps {
  /** Current demo fix; null when the player is reset/unmounted. */
  onPosition: (p: { lat: number; lon: number } | null) => void;
  lang: string;
  className?: string;
}

/** ponytail: 1 track-second per 250 ms real time; tune here if the demo pacing feels off. */
const TICK_MS = 250;
const LAST = DEMO_TRACK.length - 1;

export const TrackPlayer: React.FC<TrackPlayerProps> = ({ onPosition, lang, className = "" }) => {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  // Emit the current fix; null until first play and after reset/unmount.
  useEffect(() => {
    onPositionRef.current(started ? { lat: DEMO_TRACK[idx].lat, lon: DEMO_TRACK[idx].lon } : null);
  }, [idx, started]);
  useEffect(() => () => onPositionRef.current(null), []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setIdx((i) => {
        if (i >= LAST) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const toggle = () => {
    setStarted(true);
    if (!playing && idx >= LAST) setIdx(0);
    setPlaying((p) => !p);
  };
  const reset = () => {
    setPlaying(false);
    setStarted(false);
    setIdx(0);
  };

  const p = DEMO_TRACK[idx];
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-md bg-panel border border-border-base ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={t(playing ? "geofence.pause" : "geofence.play", lang)}
        className="min-w-[56px] min-h-[56px] rounded-md bg-raised text-accent flex items-center justify-center"
      >
        {playing ? <Pause size={26} /> : <Play size={26} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{t("geofence.demo", lang)}</span>
          <span className="num">
            {p.t}s / {DEMO_TRACK[LAST].t}s
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={LAST}
          value={idx}
          aria-label={t("geofence.scrub", lang)}
          onChange={(e) => {
            setStarted(true);
            setIdx(Number(e.target.value));
          }}
          className="w-full accent-[#38e8d0]"
        />
        <div className="text-xs text-text">
          <span className="text-muted">{t("geofence.position", lang)}: </span>
          <span className="num">
            {p.lat.toFixed(4)}N {p.lon.toFixed(4)}E
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={reset}
        aria-label={t("geofence.reset", lang)}
        className="min-w-[44px] min-h-[44px] rounded-md text-muted hover:text-text flex items-center justify-center"
      >
        <RotateCcw size={20} />
      </button>
    </div>
  );
};
