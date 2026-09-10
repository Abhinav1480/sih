"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, CornerDownRight } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { VoiceInput } from "@/components/Fisherman/VoiceInput";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  activeQueryText?: string;
  onFollowUp: (followUp: string) => void;
  /** Contextual follow-up suggestions (e.g. from the current result type) */
  suggestions?: string[];
  /** Hide the suggestion row entirely */
  hideSuggestions?: boolean;
  /** Kept for compatibility; the console has no landing treatment. */
  landing?: boolean;
  /** FE-07: show a voice-input mic that populates this input (Fisherman Mode). */
  enableVoice?: boolean;
  /** Language code used for speech recognition. */
  voiceLang?: string;
  /**
   * Clarification prompt: when ORCA answers `needs_clarification`, the
   * question is shown inline here and the user's next message answers it
   * in the same conversation.
   */
  prompt?: string;
}

export const QueryInput: React.FC<QueryInputProps> = ({
  onSubmit,
  isLoading,
  onFollowUp,
  suggestions,
  hideSuggestions = false,
  enableVoice = false,
  voiceLang = "en",
  prompt,
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const followUps = suggestions ?? [];

  // A clarification prompt pulls focus so the answer can be typed immediately.
  useEffect(() => {
    if (prompt) inputRef.current?.focus();
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <div className="w-full space-y-2">
      {prompt && (
        <div
          id="orca-clarification-prompt"
          className="flex items-start gap-2 px-3 py-2 rounded-md border border-caution/40 bg-caution/10 text-[12.5px] text-text"
        >
          <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-caution flex-shrink-0" />
          <span>
            <span className="text-caution font-medium">ORCA asks: </span>
            {prompt}
          </span>
        </div>
      )}

      {!hideSuggestions && followUps.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {followUps.map((sug) => (
            <Pill key={sug} size="sm" onClick={() => onFollowUp(sug)} disabled={isLoading} className="flex-shrink-0">
              {sug}
            </Pill>
          ))}
        </div>
      )}

      <div className={enableVoice ? "flex items-start gap-2" : ""}>
        {enableVoice && (
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <VoiceInput lang={voiceLang} onTranscript={(txt) => setText(txt)} disabled={isLoading} />
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className={`relative flex items-center rounded-md border bg-panel/80 focus-within:border-accent/60 focus-within:bg-panel transition-colors ${
            enableVoice ? "flex-1" : ""
          } ${prompt ? "border-caution/40" : "border-border-base"}`}
        >
          <span className="num absolute left-3 pointer-events-none text-accent text-[13px] select-none">&gt;</span>
          <input
            ref={inputRef}
            id="marine-query-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={prompt ? "Answer ORCA here..." : "Ask about sea state, fishing zones, routes, alerts..."}
            disabled={isLoading}
            className="w-full bg-transparent text-text text-sm py-3 pl-8 pr-12 focus:outline-none placeholder:text-muted/70"
          />
          <button
            id="marine-query-submit-btn"
            type="submit"
            disabled={isLoading || !text.trim()}
            className="absolute right-1.5 w-8 h-8 rounded-md bg-accent text-base flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/90"
            aria-label="Submit query"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4 stroke-[2.5]" />}
          </button>
        </form>
      </div>
    </div>
  );
};
