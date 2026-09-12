"use client";

/**
 * ORCA AI: the conversation is the product.
 *
 * Left: the thread, growing around a large voice button and a smaller type
 * button. Right: the answer panel for the selected turn. ORCA speaks first
 * with a greeting assembled from a real conditions fetch for the home
 * harbour; every reply is assembled by buildSpokenScript from the response
 * and nothing else, spoken and shown at once, and ORCA then waits.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFmt, useLang, useT } from "@/lib/i18n";
import { useSession } from "@/lib/auth/session";
import { query, ApiError, API_MODE } from "@/lib/api/client";
import { buildSpokenScript, type SpokenScript } from "@/lib/spoken/buildSpokenScript";
import { listen, requestMicrophone, sttSupported, type SttFailure, type SttHandle } from "@/lib/voice/stt";
import { getDevicePosition, useHomeConditions, useHomeLocation } from "@/lib/store/home";
import { getCurrentId, loadConversations, newId, setCurrentId, upsertConversation, useConversations, type Conversation, type Turn } from "@/lib/store/conversations";
import { saveTrip, tripFromEnvelope } from "@/lib/store/trips";
import type { Envelope } from "@/lib/types";
import { evidenceMatching } from "@/lib/types";
import { useSpeaker } from "./useSpeaker";
import { Transcript } from "./Transcript";
import { VoiceButton, type VoiceState } from "./VoiceButton";
import { AnswerPanel, KeyNumber, VerdictBlock } from "@/components/answer/AnswerPanel";
import { Thinking } from "@/components/answer/Thinking";
import { GeofenceInterrupt } from "@/components/answer/GeofenceInterrupt";
import { TraceRows } from "@/components/answer/TracePanel";
import { EmptyState, ErrorState, Mono } from "@/components/ui";
import { IconKeyboard, IconPlay, IconPlus, IconSave, IconSquare, IconCaution } from "@/components/ui/Icons";

type Phase = "idle" | "thinking";

function freshConversation(): Conversation {
  const now = new Date().toISOString();
  return { id: newId(), backend_id: null, title: "", created_at: now, updated_at: now, turns: [] };
}

export function OrcaAI() {
  const t = useT();
  const f = useFmt();
  const { lang } = useLang();
  const session = useSession();
  const home = useHomeLocation();
  const homeCond = useHomeConditions();
  const speaker = useSpeaker(lang);
  const history = useConversations();

  // Reopen the conversation this tab was on. Client-only page, so the lazy read is safe.
  const [conv, setConv] = useState<Conversation>(() => {
    const id = getCurrentId();
    const c = id ? loadConversations().find((x) => x.id === id) : undefined;
    return c ?? freshConversation();
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<string | null>(() => [...conv.turns].reverse().find((x) => x.envelope)?.id ?? null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [tripNote, setTripNote] = useState<string | null>(null);
  const stt = useRef<SttHandle | null>(null);
  const greeted = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  const persist = useCallback((c: Conversation) => {
    if (c.turns.length === 0) return;
    upsertConversation(c);
    setCurrentId(c.id);
  }, []);

  // The greeting, from the real home-conditions fetch. Omits every clause whose value is missing.
  const greeting: SpokenScript | null = useMemo(() => {
    if (homeCond.state === "loading") return null;
    return buildSpokenScript(homeCond.envelope, lang, session.name, { kind: "greeting", placeName: home?.name ?? null });
  }, [homeCond.state, homeCond.envelope, lang, session.name, home?.name]);

  useEffect(() => {
    if (!greeting || greeted.current || conv.turns.length > 0) return;
    greeted.current = true;
    // Browsers may refuse speech before a user gesture; the replay control is always there.
    void speaker.speak(greeting, "greeting");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting]);

  // Scripts per turn, in the current language, so switching language re-renders every transcript.
  const scripts = useMemo(() => {
    const m = new Map<string, SpokenScript>();
    for (const turn of conv.turns) if (turn.envelope) m.set(turn.id, buildSpokenScript(turn.envelope, lang, session.name));
    return m;
  }, [conv.turns, lang, session.name]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [conv.turns.length, phase]);

  // --- asking ---------------------------------------------------------------------

  const ask = useCallback(async (q: string) => {
    const question = q.trim();
    if (!question || phase === "thinking") return;
    speaker.stop();
    setText("");
    setTyping(false);
    setInterim("");
    const turn: Turn = { id: newId(), at: new Date().toISOString(), query: question, lang, envelope: null };
    const base: Conversation = { ...conv, title: conv.title || question, updated_at: turn.at, turns: [...conv.turns, turn] };
    setConv(base);
    setPhase("thinking");
    let done: Turn;
    try {
      const loc = home ? { latitude: home.latitude, longitude: home.longitude } : await getDevicePosition();
      const r = await query({ query: question, conversation_id: base.backend_id ?? undefined, preferred_language: lang, user_location: loc ?? undefined });
      done = { ...turn, envelope: r.envelope, capturedQuestion: r.capturedQuestion };
      base.backend_id = r.envelope.session_id;
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "network";
      done = { ...turn, error: code };
    }
    const next: Conversation = { ...base, turns: base.turns.map((x) => (x.id === turn.id ? done : x)) };
    setConv(next);
    persist(next);
    setPhase("idle");
    if (done.envelope) {
      setSelected(done.id);
      const script = buildSpokenScript(done.envelope, lang, session.name);
      void speaker.speak(script, done.id);
    }
  }, [conv, phase, home, lang, session.name, speaker, persist]);

  // A quick ask handed over from the dashboard is typed in as the first turn, once the greeting fetch has settled.
  useEffect(() => {
    if (homeCond.state === "loading") return;
    let q: string | null = null;
    try {
      q = sessionStorage.getItem("orca.ai.pending");
      if (q) sessionStorage.removeItem("orca.ai.pending");
    } catch {
      /* fine */
    }
    if (!q) return;
    // Handed over from another page: start it as its own turn, after this render settles.
    const pending = q;
    const id = setTimeout(() => void ask(pending), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeCond.state]);

  // --- voice input ------------------------------------------------------------------

  const failureText = useCallback((r: SttFailure): string => {
    switch (r) {
      case "unsupported": return t("ai.sttUnavailable");
      case "denied": return t("ai.micDenied");
      case "no_speech": return t("ai.sttFailed", { reason: t("ai.sttNoSpeech") });
      case "network": return t("ai.sttFailed", { reason: t("ai.sttNetwork") });
      default: return t("ai.sttFailed", { reason: r });
    }
  }, [t]);

  const startListening = useCallback(async () => {
    setVoiceNote(null);
    if (!sttSupported()) {
      setVoiceNote(t("ai.sttUnavailable"));
      setTyping(true);
      return;
    }
    const mic = await requestMicrophone();
    if ("reason" in mic) {
      setVoiceNote(failureText(mic.reason));
      setVoice("idle");
      setTyping(true);
      return;
    }
    try {
      sessionStorage.setItem("orca.mic.granted", "1");
    } catch {
      /* fine */
    }
    speaker.stop();
    setInterim("");
    const h = listen(lang, mic.stream, {
      onInterim: setInterim,
      onLevel: setLevel,
      onFinal: (final) => void ask(final),
      onEnd: () => {
        setVoice("idle");
        setLevel(0);
        stt.current = null;
      },
      onError: (r) => {
        setVoiceNote(failureText(r));
        if (r !== "no_speech" && r !== "aborted") setTyping(true);
      },
    });
    if ("reason" in h) {
      setVoiceNote(failureText(h.reason));
      setVoice("idle");
      setTyping(true);
      return;
    }
    stt.current = h;
    setVoice("listening");
  }, [ask, failureText, lang, speaker, t]);

  const onVoicePress = useCallback(() => {
    let granted = false;
    try {
      granted = sessionStorage.getItem("orca.mic.granted") === "1";
    } catch {
      /* fine */
    }
    if (granted) void startListening();
    else setVoice("explain");
  }, [startListening]);

  const stopListening = useCallback(() => {
    stt.current?.stop();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (voice === "listening") stt.current?.abort();
      if (voice === "explain") setVoice("idle");
      if (speaker.state === "speaking") speaker.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [voice, speaker]);

  useEffect(() => () => stt.current?.abort(), []);

  // --- conversation management ------------------------------------------------------

  const startNew = useCallback(() => {
    speaker.stop();
    stt.current?.abort();
    const c = freshConversation();
    setConv(c);
    setSelected(null);
    setCurrentId(null);
    greeted.current = false;
  }, [speaker]);

  const open = useCallback((c: Conversation) => {
    speaker.stop();
    setConv(c);
    setCurrentId(c.id);
    const last = [...c.turns].reverse().find((x) => x.envelope);
    setSelected(last ? last.id : null);
  }, [speaker]);

  const selectedTurn = conv.turns.find((x) => x.id === selected) ?? [...conv.turns].reverse().find((x) => x.envelope) ?? null;
  const selectedEnvelope: Envelope | null = selectedTurn?.envelope ?? null;

  const onSaveTrip = useCallback(() => {
    if (!selectedEnvelope || !selectedTurn) return;
    if (session.status !== "signed_in" || !session.user) {
      setTripNote(t("trips.needAccount"));
      return;
    }
    saveTrip(tripFromEnvelope(selectedEnvelope, session.user.id, selectedTurn.query, conv.backend_id));
    setTripNote(t("ai.tripSaved"));
  }, [selectedEnvelope, selectedTurn, session.status, session.user, conv.backend_id, t]);

  const voiceUnavailable = speaker.availability === "no_voice" ? t("ai.voiceUnavailable") : speaker.availability === "unsupported" ? t("ai.ttsUnavailable") : null;

  return (
    <div className="space-y-4">
      <GeofenceInterrupt envelope={selectedEnvelope} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ---------------------------------------------------------------- thread */}
        <section className="surface flex min-h-[70vh] flex-col p-5" aria-label={t("ai.title")}>
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold">{t("ai.title")}</h1>
            <div className="flex items-center gap-1">
              <details className="relative">
                <summary className="btn btn-quiet btn-sm">{t("ai.history")} <Mono className="text-xs">{f.int(history.length)}</Mono></summary>
                <div className="surface absolute right-0 z-20 mt-1 w-72 max-h-80 overflow-auto py-1 arrive">
                  {history.length === 0 && <p className="px-3 py-2 text-sm text-text-2">{t("ai.historyEmpty")}</p>}
                  {history.map((c: Conversation) => (
                    <button key={c.id} type="button" className={`block w-full px-3 py-2 text-left text-sm hover:bg-[var(--accent-tint)] ${c.id === conv.id ? "bg-[var(--accent-tint)]" : ""}`} onClick={() => open(c)}>
                      <div className="truncate">{c.title}</div>
                      <div className="text-xs text-text-3"><Mono>{f.dateTime(c.updated_at)}</Mono> · {t("ai.turnOf", { n: f.int(c.turns.length) })}</div>
                    </button>
                  ))}
                </div>
              </details>
              <button type="button" className="btn btn-quiet btn-sm" onClick={startNew}><IconPlus size={14} />{t("ai.new")}</button>
            </div>
          </header>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
            {/* greeting */}
            {conv.turns.length === 0 && (
              <div className="surface-2 p-4">
                <div className="eyebrow mb-2">{t("ai.orca")}</div>
                {greeting ? (
                  <>
                    <Transcript script={greeting} activeSentence={speaker.scriptId === "greeting" ? speaker.activeSentence : -1} activeWord={speaker.scriptId === "greeting" ? speaker.activeWord : null} large />
                    <ReplayControls speaking={speaker.state === "speaking" && speaker.scriptId === "greeting"} onPlay={() => void speaker.speak(greeting, "greeting")} onStop={speaker.stop} />
                  </>
                ) : (
                  <p className="text-text-2">{t("common.loading")}…</p>
                )}
                {voiceUnavailable && <p className="mt-2 text-sm ink-MODERATE">{voiceUnavailable}</p>}
                {homeCond.state === "error" && <p className="mt-2 text-sm text-text-2">{t("dash.conditionsFailed")}</p>}
                {homeCond.state === "no_home" && <p className="mt-2 text-sm text-text-2">{t("dash.noHome")}</p>}
              </div>
            )}

            {conv.turns.map((turn, i) => {
              const script = scripts.get(turn.id);
              const isSel = selectedTurn?.id === turn.id;
              return (
                <div key={turn.id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-[var(--radius)] bg-[var(--accent-tint)] px-4 py-2">
                      <div className="eyebrow mb-0.5">{t("common.you")}</div>
                      <p>{turn.query}</p>
                    </div>
                  </div>
                  {turn.error && (
                    <ErrorState title={t("ai.turnFailed", { reason: apiErrorText(t, turn.error) })} onRetry={() => void ask(turn.query)} />
                  )}
                  {turn.envelope && script && (
                    <button type="button" onClick={() => setSelected(turn.id)} className={`block w-full rounded-[var(--radius)] border p-4 text-left transition-colors ${isSel ? "border-[var(--accent)] bg-[var(--surface-2)]" : "border-hairline hover:border-[var(--accent)]"}`} aria-pressed={isSel}>
                      <div className="eyebrow mb-2 flex items-center justify-between">
                        <span>{t("ai.orca")} · {t("ai.turnOf", { n: f.int(i + 1) })}</span>
                        {turn.capturedQuestion && API_MODE === "captures" && <span className="normal-case tracking-normal font-normal">{t("common.recorded")}</span>}
                      </div>
                      <Transcript script={script} activeSentence={speaker.scriptId === turn.id ? speaker.activeSentence : -1} activeWord={speaker.scriptId === turn.id ? speaker.activeWord : null} large={i === conv.turns.length - 1} />
                      <ReplayControls speaking={speaker.state === "speaking" && speaker.scriptId === turn.id} onPlay={() => void speaker.speak(script, turn.id)} onStop={speaker.stop} />
                      {voiceUnavailable && i === conv.turns.length - 1 && <p className="mt-2 text-sm ink-MODERATE">{voiceUnavailable}</p>}
                    </button>
                  )}
                  {!turn.envelope && !turn.error && phase === "thinking" && i === conv.turns.length - 1 && (
                    <div className="surface-2 p-4">
                      <Thinking />
                      <div className="mt-3"><TraceRows events={[]} /></div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={threadEnd} />
          </div>

          {/* ------------------------------------------------------------ controls */}
          <div className="mt-6 border-t border-hairline pt-6">
            {voice === "explain" && (
              <div className="mx-auto mb-4 max-w-md surface-2 p-4 text-center arrive" role="dialog" aria-modal="false">
                <p className="text-sm">{t("ai.micExplain")}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => void startListening()}>{t("ai.micAllow")}</button>
                  <button type="button" className="btn" onClick={() => { setVoice("idle"); setTyping(true); }}>{t("ai.type")}</button>
                </div>
              </div>
            )}
            {voice === "listening" && (
              <div className="mx-auto mb-4 max-w-2xl text-center" aria-live="polite">
                <p className="text-2xl leading-relaxed" lang={lang}>{interim || <span className="text-text-3">{t("ai.interim")}…</span>}</p>
              </div>
            )}
            {voiceNote && (
              <p className="mx-auto mb-3 flex max-w-md items-start gap-2 text-sm ink-MODERATE"><IconCaution size={16} className="mt-0.5 shrink-0" />{voiceNote}</p>
            )}
            <VoiceButton state={phase === "thinking" ? "disabled" : voice === "listening" ? "listening" : "idle"} level={level} onPress={onVoicePress} onStop={stopListening} />
            <div className="mt-4 flex justify-center">
              {!typing ? (
                <button type="button" className="btn btn-sm" onClick={() => { setTyping(true); setTimeout(() => inputRef.current?.focus(), 0); }}><IconKeyboard size={16} />{t("ai.type")}</button>
              ) : (
                <form className="flex w-full max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
                  <input ref={inputRef} className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("ai.typePlaceholder")} disabled={phase === "thinking"} autoFocus />
                  <button type="submit" className="btn btn-primary" disabled={phase === "thinking" || !text.trim()}>{t("ai.send")}</button>
                </form>
              )}
            </div>
            {conv.turns.length > 0 && <p className="mt-3 text-center text-xs text-text-3">{t("ai.followUp")}</p>}
          </div>
        </section>

        {/* ---------------------------------------------------------------- panel */}
        <section className="surface p-5" aria-label={t("ai.panel")}>
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{t("ai.panel")}</h2>
            {selectedEnvelope && (
              <div className="flex items-center gap-2">
                {tripNote && <span className="text-xs text-text-2">{tripNote}</span>}
                <button type="button" className="btn btn-sm" onClick={onSaveTrip}><IconSave size={14} />{t("ai.saveTrip")}</button>
              </div>
            )}
          </header>
          {selectedEnvelope ? (
            <AnswerPanel envelope={selectedEnvelope} capturedQuestion={selectedTurn?.capturedQuestion} />
          ) : phase === "thinking" ? (
            <div className="space-y-4"><Thinking /><TraceRows events={[]} /></div>
          ) : (
            <PanelIdle homeEnvelope={homeCond.envelope} place={home?.name ?? null} />
          )}
        </section>
      </div>
    </div>
  );
}

function ReplayControls({ speaking, onPlay, onStop }: { speaking: boolean; onPlay: () => void; onStop: () => void }) {
  const t = useT();
  return (
    <div className="mt-2 flex gap-2">
      {speaking ? (
        <span role="button" tabIndex={0} className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onStop(); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onStop(); } }}><IconSquare size={14} />{t("ai.stop")}</span>
      ) : (
        <span role="button" tabIndex={0} className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onPlay(); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onPlay(); } }}><IconPlay size={14} />{t("ai.replay")}</span>
      )}
    </div>
  );
}

function PanelIdle({ homeEnvelope, place }: { homeEnvelope: Envelope | null; place: string | null }) {
  const t = useT();
  const f = useFmt();
  if (!homeEnvelope) return <EmptyState title={t("answer.empty")} />;
  const wave = evidenceMatching(homeEnvelope, /wave height/i);
  const wind = evidenceMatching(homeEnvelope, /wind/i);
  return (
    <div className="space-y-4">
      <div className="eyebrow">{place ? t("dash.today", { place }) : t("common.location")}</div>
      <VerdictBlock envelope={homeEnvelope} large={false} />
      <div className="grid gap-3 sm:grid-cols-3">
        <KeyNumber label={t("answer.wave")} value={wave ? wave.value : null} unit={wave?.unit} tier={wave?.provider_tier} status={wave?.status} />
        <KeyNumber label={t("answer.wind")} value={wind ? wind.value : null} unit={wind?.unit} tier={wind?.provider_tier} status={wind?.status} />
        <KeyNumber label={t("answer.validUntil")} value={homeEnvelope.meta.temporal.end_time ? f.dateTime(homeEnvelope.meta.temporal.end_time) : null} note={t("answer.validUntilNote")} />
      </div>
      <EmptyState title={t("answer.empty")} />
    </div>
  );
}

export function apiErrorText(t: ReturnType<typeof useT>, code: string): string {
  switch (code) {
    case "timeout": return t("common.error.timeout");
    case "server": return t("common.error.server");
    case "bad_response": return t("common.error.badResponse");
    default: return t("common.error.network");
  }
}
