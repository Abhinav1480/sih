"use client";

import React, { useEffect, useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { TemporalState } from "@/lib/types";

interface TimeScrubberProps {
  temporalState: TemporalState;
  onTimeChange: (time: string) => void;
  onTogglePlay: () => void;
  noDataForSelectedTime?: boolean;
}

function formatDisplayTime(isoString?: string | null): { date: string; time: string; tz: string } {
  if (!isoString) return { date: "", time: "--:--", tz: "" };

  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { date: "", time: isoString, tz: "IST" };
    }
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    return { date, time, tz: "IST" };
  } catch {
    return { date: "", time: isoString, tz: "" };
  }
}

export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  temporalState,
  onTimeChange,
  onTogglePlay,
  noDataForSelectedTime = false,
}) => {
  const { selectedTime, availableTimes, isTimeVarying, isPlaying } = temporalState;

  // If there's no time-varying data or only one timestamp, hide the scrubber completely!
  if (!isTimeVarying || !availableTimes || availableTimes.length <= 1) {
    return null;
  }

  const currentIndex = selectedTime ? availableTimes.indexOf(selectedTime) : 0;
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Handle Play/Pause Auto-advancement strictly through actual available timestamps
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const nextIndex = (safeIndex + 1) % availableTimes.length;
      onTimeChange(availableTimes[nextIndex]);
    }, 2000); // 2 seconds per real timestamp step

    return () => clearInterval(interval);
  }, [isPlaying, safeIndex, availableTimes, onTimeChange]);

  const handleStepBack = () => {
    const prevIndex = Math.max(0, safeIndex - 1);
    onTimeChange(availableTimes[prevIndex]);
  };

  const handleStepForward = () => {
    const nextIndex = Math.min(availableTimes.length - 1, safeIndex + 1);
    onTimeChange(availableTimes[nextIndex]);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (availableTimes[idx]) {
      onTimeChange(availableTimes[idx]);
    }
  };

  const currentFormatted = formatDisplayTime(selectedTime || availableTimes[0]);

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-lg bg-orca-panel/95 backdrop-blur-md border border-orca-border/90 rounded-xl px-3 py-2 shadow-2xl space-y-1.5"
      aria-label="Temporal time scrubber"
    >
      {/* Top row: Label, Time badge, Play/Pause */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-bold text-orca-cyan uppercase tracking-wider">
            <Clock className="w-3 h-3 text-orca-cyan" />
            <span>TIME</span>
          </div>

          {/* Monospace Timestamp Display */}
          <div className="px-2 py-0.5 rounded bg-orca-darkest/80 border border-orca-border/60 font-mono text-[11px] text-white flex items-center gap-1.5">
            {currentFormatted.date && (
              <span className="text-slate-400">{currentFormatted.date}</span>
            )}
            <span className="font-bold text-orca-cyan">{currentFormatted.time}</span>
            <span className="text-[9px] text-orca-dim">{currentFormatted.tz}</span>
          </div>
        </div>

        {/* Play / Step Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleStepBack}
            disabled={safeIndex === 0}
            className="p-1 rounded hover:bg-orca-dark text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Step backward"
            aria-label="Step backward"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition flex items-center gap-1 ${
              isPlaying
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-orca-cyan/20 text-orca-cyan border border-orca-cyan/40 hover:bg-orca-cyan/30"
            }`}
            title={isPlaying ? "Pause playback" : "Play forecast timeline"}
            aria-label={isPlaying ? "Pause playback" : "Play forecast timeline"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-2.5 h-2.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleStepForward}
            disabled={safeIndex === availableTimes.length - 1}
            className="p-1 rounded hover:bg-orca-dark text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Step forward"
            aria-label="Step forward"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Discrete Timeline Scrubber Slider */}
      <div className="relative flex items-center pt-1 pb-0.5">
        <input
          type="range"
          min={0}
          max={availableTimes.length - 1}
          step={1}
          value={safeIndex}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-orca-dark rounded-lg appearance-none cursor-pointer accent-orca-cyan"
          aria-label="Timeline slider"
        />
      </div>

      {/* Step Markers / Timestamps Display */}
      <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
        {availableTimes.map((timeStr, idx) => {
          const { time } = formatDisplayTime(timeStr);
          const isSelected = idx === safeIndex;
          return (
            <button
              key={timeStr}
              type="button"
              onClick={() => onTimeChange(timeStr)}
              className={`transition hover:text-white ${
                isSelected
                  ? "text-orca-cyan font-bold scale-105"
                  : "text-slate-500"
              }`}
            >
              {time}
            </button>
          );
        })}
      </div>

      {/* Notice if no data for selected time */}
      {noDataForSelectedTime && (
        <div className="pt-1 text-[9.5px] text-amber-300 flex items-center justify-center gap-1 border-t border-amber-500/20">
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span>No dynamic data for selected time (static layers remain visible).</span>
        </div>
      )}
    </div>
  );
};
