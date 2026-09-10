/** Shared contract between the voice layer (Track B) and the Fisherman UI (Track E). */

export type SttState = "idle" | "requesting" | "listening" | "processing" | "unavailable" | "denied" | "nomatch" | "error";

export interface UseSpeechToText {
  state: SttState;
  /** 0..1 audio level while listening; 0 otherwise. */
  level: number;
  /** Partial transcript while the user is still speaking. */
  partial: string;
  /** Human-readable, localized reason for unavailable/denied/nomatch/error. */
  message: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface UseSpeechToTextOptions {
  lang: string; // ORCA code: en | te | hi | ta | ...
  onFinal: (text: string) => void;
  onPartial?: (text: string) => void;
}

export interface SpeakResult {
  ok: boolean;
  /** Present when ok=false: e.g. "voice.pack.missing" (i18n key) */
  reasonKey?: string;
  /** BCP-47 tag that was requested. */
  lang: string;
}

export interface UseTextToSpeech {
  speaking: boolean;
  /** null until enumerated; then the list of BCP-47 tags the device can speak. */
  supported: string[] | null;
  /** Whether the current lang has an installed voice. */
  hasVoice: boolean;
  speak: (text: string) => Promise<SpeakResult>;
  stop: () => Promise<void>;
}
