/**
 * Speech input over the Web Speech API, with an audio-level meter from the
 * microphone stream. Interim results are surfaced as they arrive so the page
 * can show live subtitles in the speaker's own script. Every failure is a
 * named reason the UI turns into a sentence and an offer to type instead.
 */

const TAG: Record<string, string> = { en: "en-IN", te: "te-IN", ta: "ta-IN", hi: "hi-IN" };

export type SttFailure = "unsupported" | "insecure" | "denied" | "no_speech" | "audio_capture" | "network" | "aborted" | "error";

export interface SttHandlers {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onLevel?: (level: number) => void;
  onEnd?: () => void;
  onError?: (reason: SttFailure) => void;
}

export interface SttHandle {
  stop: () => void;
  abort: () => void;
}

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return ctor() !== null;
}

export function sttSecure(): boolean {
  return typeof window !== "undefined" && (window.isSecureContext || location.hostname === "localhost");
}

/** Ask for the microphone explicitly, so the page can explain first. Returns the stream or a failure reason. */
export async function requestMicrophone(): Promise<{ stream: MediaStream } | { reason: SttFailure }> {
  if (!sttSecure()) return { reason: "insecure" };
  if (!navigator.mediaDevices?.getUserMedia) return { reason: "audio_capture" };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { stream };
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === "NotAllowedError" || name === "SecurityError") return { reason: "denied" };
    if (name === "NotFoundError" || name === "OverconstrainedError") return { reason: "audio_capture" };
    return { reason: "error" };
  }
}

export function listen(lang: string, stream: MediaStream | null, handlers: SttHandlers): SttHandle | { reason: SttFailure } {
  const R = ctor();
  if (!R) return { reason: "unsupported" };
  if (!sttSecure()) return { reason: "insecure" };

  // Level meter from the stream we were granted.
  let audioCtx: AudioContext | null = null;
  let raf = 0;
  if (stream && handlers.onLevel) {
    try {
      audioCtx = new AudioContext();
      const src = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        handlers.onLevel?.(Math.min(1, Math.sqrt(sum / buf.length) * 3));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch {
      /* no meter; recognition still runs */
    }
  }

  const rec = new R();
  rec.lang = TAG[lang] ?? lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let finalText = "";
  let ended = false;
  const cleanup = () => {
    if (raf) cancelAnimationFrame(raf);
    audioCtx?.close().catch(() => {});
    stream?.getTracks().forEach((t) => t.stop());
  };

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onInterim?.((finalText + " " + interim).trim());
  };
  rec.onerror = (e) => {
    const map: Record<string, SttFailure> = {
      "not-allowed": "denied", "service-not-allowed": "denied", "no-speech": "no_speech",
      "audio-capture": "audio_capture", network: "network", aborted: "aborted",
    };
    handlers.onError?.(map[e.error] ?? "error");
  };
  rec.onend = () => {
    if (ended) return;
    ended = true;
    cleanup();
    const text = finalText.trim();
    if (text) handlers.onFinal?.(text);
    handlers.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    cleanup();
    return { reason: "error" };
  }

  return {
    stop: () => rec.stop(),
    abort: () => {
      ended = true;
      cleanup();
      rec.abort();
      handlers.onEnd?.();
    },
  };
}
