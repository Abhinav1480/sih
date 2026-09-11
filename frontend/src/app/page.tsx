"use client";

/**
 * The app shell (P3): an entrance, five tabs with their own stacks, one
 * conversation thread, voice as a mode, one language, one network status,
 * one GPS watch.
 *
 * Nothing here judges the sea. Verdict wording and colour come from
 * lib/design/verdict.ts (a keyed lookup); numbers come from the envelope;
 * every visible string comes from the locale tables through t(). An answer
 * shown is the answer to the question asked; a failure is shown as one.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { color, touch } from "@/lib/design/tokens";
import { ASKS, TABS } from "@/lib/i18n/app";
import { isLangCode, useLang } from "@/lib/i18n/useLang";
import { localiseDigits } from "@/lib/i18n/digits";
import { useAnalysis, type OfflineOffer } from "@/lib/data/useAnalysis";
import { useDashboard } from "@/lib/data/useDashboard";
import { deleteThread, loadThreads, newId, newThread, saveThread, type Thread, type Turn } from "@/lib/data/thread";
import { DEFAULT_LOCATION } from "@/lib/data/placeholders";
import { HARBOURS } from "@/lib/data/harbours";
import { KNOWN_CARD_TYPES, type Envelope } from "@/lib/contract/envelope";
import { useNetworkStatus } from "@/lib/offline/network";
import { formatAge, loadTripCard, loadTrips, loadVesselProfile, saveTrip, saveTripCard, saveVesselProfile, type VesselProfile } from "@/lib/offline/store";
import { buildTripCard, type TripCard } from "@/lib/offline/tripCard";
import { DEMO_TRACK, useGeofence } from "@/lib/geofence";
import { useSpeechInput, useSpeechOutput, buildSpokenText } from "@/lib/voice";
import type { OrcaAnalysisResponse } from "@/lib/types";
import { initNativeShell, registerBackHandler } from "@/lib/native";
import { useSession } from "@/lib/auth/session";
import { BigButton, EmptyState, Icon, btnReset, sans } from "@/components/app/primitives";
import { AnswerCard } from "@/components/app/AnswerCard";
import { AskScreen } from "@/components/app/screens/Ask";
import { HistoryScreen } from "@/components/app/screens/History";
import { ListeningScreen } from "@/components/app/screens/Listening";
import { CheckingScreen } from "@/components/app/screens/Checking";
import { AnswerScreen } from "@/components/app/screens/Answer";
import { WhyScreen } from "@/components/app/screens/Why";
import { EvidenceScreen } from "@/components/app/screens/Evidence";
import { MapScreen } from "@/components/app/screens/MapScreen";
import { TripsScreen } from "@/components/app/screens/Trips";
import { MyBoatScreen } from "@/components/app/screens/MyBoat";
import { LanguageScreen } from "@/components/app/screens/Language";
import { OfflineScreen } from "@/components/app/screens/Offline";
import { EmergencyScreen } from "@/components/app/screens/Emergency";
import { BorderWarningOverlay } from "@/components/app/screens/BorderWarning";
import { StaleWarning } from "@/components/Offline/StaleWarning";
import { SplashScreen, WelcomeScreen, SignUpScreen, SignInScreen, ForgotScreen } from "@/components/app/screens/Auth";
import { OnboardingScreen } from "@/components/app/screens/Onboarding";
import { ProfileScreen } from "@/components/app/screens/Profile";
import { DashboardScreen } from "@/components/app/screens/Dashboard";
import { AlertsScreen } from "@/components/app/screens/Alerts";

type Overlay = "answer" | "why" | "evidence" | "language" | "offline" | "emergency" | "profile" | "onboarding" | "needAccount" | "history" | "alerts";
type AuthScreen = "welcome" | "signup" | "signin" | "forgot";
/** Voice mode is a full-screen state machine, not an overlay on a stack. */
type VoiceMode = null | "listening" | "checking" | "answer";

/** ponytail: the TTS plugin gives no word boundaries on Android, so the highlight runs on a clock at ~2.3 words/s (rate 0.9). */
const MS_PER_WORD = 430;
const TAB_ICONS = ["wave", "map", "mic", "list", "boat"] as const;
const TAB_TODAY = 0, TAB_MAP = 1, TAB_ASK = 2, TAB_TRIPS = 3, TAB_BOAT = 4;

export default function AppPage() {
  const { lang, setLang, t, native, hasVoice: designVoice } = useLang();
  const { state, ask, reset } = useAnalysis();
  const session = useSession();
  const net = useNetworkStatus();
  const [mounted, setMounted] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("welcome");

  // --- navigation: five tabs, each with its own stack ---------------------------
  const [tab, setTab] = useState(TAB_TODAY);
  const [stacks, setStacks] = useState<Overlay[][]>([[], [], [], [], []]);
  const stack = stacks[tab];
  const top = stack[stack.length - 1];
  const push = useCallback((o: Overlay) => setStacks((s) => s.map((st, i) => (i === tab ? [...st, o] : st))), [tab]);
  const pop = useCallback(() => setStacks((s) => s.map((st, i) => (i === tab ? st.slice(0, -1) : st))), [tab]);
  const clearStack = useCallback(() => setStacks((s) => s.map((st, i) => (i === tab ? [] : st))), [tab]);
  const clearAll = useCallback(() => setStacks([[], [], [], [], []]), []);

  // --- persisted things ----------------------------------------------------------
  const [profile, setProfile] = useState<VesselProfile | null>(null);
  const [trip, setTrip] = useState<TripCard | null>(null);
  const [trips, setTrips] = useState<TripCard[] | null>(null);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [thread, setThread] = useState<Thread>(() => newThread());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [viewEnv, setViewEnv] = useState<Envelope | null>(null); // the envelope the answer/why/evidence overlays show
  const [micNote, setMicNote] = useState<string | null>(null);
  const [demo, setDemo] = useState<number | null>(null);
  const [warnAcked, setWarnAcked] = useState(false);

  useEffect(() => {
    setMounted(true);
    initNativeShell();
    loadVesselProfile().then(setProfile);
    loadTripCard().then(setTrip);
    loadTrips().then(setTrips);
    loadThreads().then((ts) => { setThreads(ts); if (ts[0]) setThread(ts[0]); });
  }, []);

  // --- GPS and the geofence; the demo drive replaces the fix when running -------
  const demoPos = demo !== null ? DEMO_TRACK[Math.min(demo, DEMO_TRACK.length - 1)] : null;
  const geo = useGeofence({ enabled: true, source: demo !== null ? "demo" : "gps", demoPosition: demoPos, onSevere: () => setWarnAcked(false) });
  useEffect(() => {
    if (demo === null) return;
    const id = setInterval(() => setDemo((i) => (i === null || i >= DEMO_TRACK.length - 1 ? i : i + 1)), 250);
    return () => clearInterval(id);
  }, [demo]);
  const position = geo.position ? { lat: geo.position.lat, lon: geo.position.lon } : null;
  const severe = geo.status?.level === "severe" && !warnAcked;

  // --- voice output ------------------------------------------------------------------
  const tts = useSpeechOutput(lang);
  const [spoken, setSpoken] = useState<{ turnId: string; words: string[]; idx: number } | null>(null);
  const wordTimer = useRef<number | null>(null);
  useEffect(() => { if (tts.supported) console.log("[tts] getSupportedLanguages()", tts.supported); }, [tts.supported]);

  const speakEnvelope = useCallback(async (env: Envelope, turnId: string) => {
    const text = buildSpokenText(env as unknown as OrcaAnalysisResponse, lang).text;
    const words = text.split(/\s+/).filter(Boolean);
    setSpoken({ turnId, words, idx: 0 });
    if (wordTimer.current) window.clearInterval(wordTimer.current);
    wordTimer.current = window.setInterval(() => setSpoken((s) => (s && s.idx + 1 < s.words.length ? { ...s, idx: s.idx + 1 } : s)), MS_PER_WORD);
    const r = await tts.speak(text);
    if (wordTimer.current) window.clearInterval(wordTimer.current);
    setSpoken((s) => (s ? { ...s, idx: -1 } : s));
    return r;
  }, [lang, tts]);
  const stopSpeaking = useCallback(() => { tts.stop(); if (wordTimer.current) window.clearInterval(wordTimer.current); setSpoken(null); }, [tts]);

  // --- the thread ------------------------------------------------------------------------
  const currentTurn = useRef<string | null>(null);
  const [voice, setVoice] = useState<VoiceMode>(null);

  const askInThread = useCallback((q: string, viaVoice = false) => {
    const turn: Turn = { id: newId(), query: q, askedAt: new Date().toISOString(), state: "checking" };
    currentTurn.current = turn.id;
    setThread((th) => ({ ...th, title: th.title || q, updatedAt: turn.askedAt, turns: [...th.turns, turn] }));
    const loc = position ?? DEFAULT_LOCATION;
    if (viaVoice) setVoice("checking");
    ask(q, { latitude: loc.lat, longitude: loc.lon }, thread.conversationId ?? undefined, lang);
  }, [ask, position, lang, thread.conversationId]);

  // The answer (or failure) lands in the turn that asked for it.
  useEffect(() => {
    const id = currentTurn.current;
    if (!id) return;
    if (state.phase === "answer") {
      const env = state.envelope;
      setThread((th) => {
        const next: Thread = { ...th, conversationId: th.conversationId ?? env.session_id ?? null, updatedAt: new Date().toISOString(),
          turns: th.turns.map((tu) => (tu.id === id ? { ...tu, state: "answer", envelope: env, source: state.source, savedAt: state.savedAt } : tu)) };
        saveThread(next).then(setThreads);
        return next;
      });
      if (state.source === "live") setLastSavedAt(new Date().toISOString());
      if (voice) { setVoice("answer"); if (tts.hasVoice) speakEnvelope(env, id); }
      currentTurn.current = null;
    } else if (state.phase === "error") {
      const { kind, detail, offers } = state;
      setThread((th) => {
        const next: Thread = { ...th, turns: th.turns.map((tu) => (tu.id === id ? { ...tu, state: "error", error: { kind, detail }, offers } : tu)) };
        saveThread(next).then(setThreads);
        return next;
      });
      if (voice) setVoice("answer");
      currentTurn.current = null;
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The reader chose an offered answer for a failed turn: it becomes that turn's (cached) answer, named by its question. */
  const acceptOffer = useCallback((turnId: string, offer: OfflineOffer) => {
    setThread((th) => {
      const next: Thread = { ...th, turns: th.turns.map((tu) => (tu.id === turnId ? { ...tu, state: "answer", envelope: offer.envelope, source: offer.source, savedAt: offer.savedAt, error: undefined, offers: undefined } : tu)) };
      saveThread(next).then(setThreads);
      return next;
    });
  }, []);

  const retryTurn = useCallback((turn: Turn) => {
    setThread((th) => ({ ...th, turns: th.turns.filter((tu) => tu.id !== turn.id) }));
    askInThread(turn.query, false);
  }, [askInThread]);

  const startNewThread = useCallback(() => { reset(); stopSpeaking(); setThread(newThread()); }, [reset, stopSpeaking]);

  const lastAnswered = [...thread.turns].reverse().find((tu) => tu.state === "answer" && tu.envelope);
  const env = lastAnswered?.envelope ?? null;

  // --- voice input ------------------------------------------------------------------------
  const [listenStart, setListenStart] = useState(0);
  const stt = useSpeechInput({ lang, onFinal: (text) => { if (text.trim()) askInThread(text.trim(), true); else { setMicNote(t("micNoMatch")); setVoice(null); } } });
  const holdStartState = useRef<string | null>(null);
  const startListening = useCallback(() => { setMicNote(null); stopSpeaking(); setListenStart(Date.now()); holdStartState.current = stt.state; setVoice("listening"); stt.start(); }, [stt, stopSpeaking]);
  const holdEnd = useCallback(() => {
    if (stt.state === "listening" || stt.state === "processing") { stt.start(); return; } // start() while listening = finalise
    if (stt.state === "requesting") return;
    stt.stop(); setVoice(null);
  }, [stt]);
  useEffect(() => {
    if (voice !== "listening") return;
    if (stt.state === holdStartState.current) return;
    holdStartState.current = null;
    if (stt.state === "denied") { setMicNote(t("micDenied")); setVoice(null); }
    else if (stt.state === "unavailable" || stt.state === "error") { setMicNote(t("micUnavailable")); setVoice(null); }
    else if (stt.state === "nomatch") { setMicNote(t("micNoMatch")); setVoice(null); }
  }, [stt.state, voice, t]);
  const exitVoice = useCallback(() => { stt.stop(); stopSpeaking(); setVoice(null); setTab(TAB_ASK); }, [stt, stopSpeaking]);

  // --- hardware back: pop within the tab, then Today, then minimise --------------------
  useEffect(() => registerBackHandler(() => {
    if (session.status === "signed_out") { if (authScreen === "welcome") return false; setAuthScreen("welcome"); return true; }
    if (voice) { exitVoice(); return true; }
    if (stack.length > 0) { pop(); return true; }
    if (tab !== TAB_TODAY) { setTab(TAB_TODAY); return true; }
    return false;
  }), [session.status, authScreen, voice, exitVoice, stack.length, pop, tab]);

  // --- dashboard, map centre, derived ---------------------------------------------------
  const homeHarbour = (session.user?.profile as { home_harbour?: { name?: string; lat?: number; lon?: number } } | undefined)?.home_harbour;
  const home = useMemo(() => (homeHarbour && Number.isFinite(homeHarbour.lat) && Number.isFinite(homeHarbour.lon)
    ? { name: homeHarbour.name ?? "", lat: homeHarbour.lat as number, lon: homeHarbour.lon as number }
    : { name: HARBOURS[1].name, lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon }), [homeHarbour]);
  const [dashNonce, setDashNonce] = useState(0);
  const dash = useDashboard({ conditionsQuery: t("condQuery").replace("{place}", home.name), location: { latitude: home.lat, longitude: home.lon }, preferredLanguage: lang, nonce: dashNonce });
  useEffect(() => { if (dash.conditions.status === "ready") setLastSavedAt(dash.conditions.fetchedAt); }, [dash.conditions]);
  const mapEnv = env ?? (dash.conditions.status === "ready" ? dash.conditions.data : null);
  const mapCenter = useMemo(() => {
    const loc = mapEnv?.meta?.location;
    return loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude) ? { lat: loc.latitude, lon: loc.longitude } : DEFAULT_LOCATION;
  }, [mapEnv]);
  const asks = ((ASKS as Record<string, readonly string[]>)[lang] ?? ASKS.en).slice();
  const tabs = (TABS as Record<string, readonly string[]>)[lang] ?? TABS.en;
  const avatar = session.user ? session.user.name.trim().charAt(0).toUpperCase() : null;
  const voiceNote = !designVoice || !tts.hasVoice ? t("listenNoVoice") : null;

  const saveForTrip = useCallback(async () => {
    const source = env ?? mapEnv;
    if (!source) return;
    const card = buildTripCard(source as unknown as OrcaAnalysisResponse);
    await saveTripCard(card);
    setTrip(card);
    setTrips(await saveTrip(card));
  }, [env, mapEnv]);

  const openAnswer = useCallback((e: Envelope) => { setViewEnv(e); push("answer"); }, [push]);
  const openWhy = useCallback((e: Envelope) => { setViewEnv(e); push("why"); }, [push]);
  const openEvidence = useCallback((e: Envelope) => { setViewEnv(e); push("evidence"); }, [push]);

  // --- entrance ---------------------------------------------------------------------------
  const isGuest = session.status === "guest";
  const canPersist = session.status === "signed_in";
  const needsAccount = useCallback(() => push("needAccount"), [push]);
  const finishOnboarding = useCallback(async (r: { language: string; harbour: { name: string; lat: number; lon: number } | null; vessel: VesselProfile | null }) => {
    if (r.vessel) { await saveVesselProfile(r.vessel); setProfile(r.vessel); }
    if (canPersist) {
      const profilePatch: Record<string, unknown> = {};
      if (r.harbour) profilePatch.home_harbour = r.harbour;
      if (r.vessel) profilePatch.vessel = r.vessel;
      try { await session.updateProfile({ preferred_language: r.language, ...(Object.keys(profilePatch).length ? { profile: profilePatch } : {}) }); } catch { /* offline: kept locally */ }
    }
    await session.finishOnboarding();
    clearAll();
  }, [canPersist, session, clearAll]);
  const signOut = useCallback(async () => {
    stopSpeaking(); reset(); clearAll(); setTab(TAB_TODAY); setThread(newThread()); setLastSavedAt(null);
    await session.signOut(); setAuthScreen("welcome");
  }, [stopSpeaking, reset, clearAll, session]);

  // --- render -------------------------------------------------------------------------------
  if (!mounted || !splashDone || session.status === "loading") return <SplashScreen onDone={() => setSplashDone(true)} />;
  if (session.status === "signed_out") {
    const frame = (child: React.ReactNode) => (
      <div style={{ position: "fixed", inset: 0, background: color.header, boxSizing: "border-box", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>{child}</div>
    );
    if (authScreen === "signup") return frame(<SignUpScreen t={t} lang={lang} onBack={() => setAuthScreen("welcome")} onSignIn={() => setAuthScreen("signin")}
      onSubmit={async (id, pw, name, language) => { await session.signUp(id, pw, name, language); if (isLangCode(language)) setLang(language); setStacks([["onboarding"], [], [], [], []]); setTab(TAB_TODAY); }} />);
    if (authScreen === "signin") return frame(<SignInScreen t={t} onBack={() => setAuthScreen("welcome")} onForgot={() => setAuthScreen("forgot")} onSignUp={() => setAuthScreen("signup")}
      onSubmit={async (id, pw) => { const u = await session.signIn(id, pw); if (isLangCode(u.preferred_language)) setLang(u.preferred_language); clearAll(); }} />);
    if (authScreen === "forgot") return frame(<ForgotScreen t={t} onBack={() => setAuthScreen("signin")} onGuest={() => session.continueAsGuest()} />);
    return frame(<WelcomeScreen t={t} onGuest={() => session.continueAsGuest()} onSignIn={() => setAuthScreen("signin")} onSignUp={() => setAuthScreen("signup")} />);
  }

  const tabScreen = [
    <DashboardScreen key="d" t={t} lang={lang} langNative={native} avatar={avatar} online={net.online}
      homeName={home.name} conditions={dash.conditions} alerts={dash.alerts as never} trip={trip} quickAsks={asks} lastSyncAt={lastSavedAt}
      onReload={() => setDashNonce((n) => n + 1)} onOpenConditions={openAnswer}
      onAsk={(q) => { setTab(TAB_ASK); askInThread(q); }} onTrip={() => setTab(TAB_TRIPS)} onProfile={() => push("profile")} onLanguage={() => push("language")} onEmergency={() => push("emergency")} onAlerts={() => push("alerts")} />,
    <MapScreen key="m" envelope={mapEnv} position={position} center={mapCenter} lang={lang} t={t} onSpeak={(s) => tts.speak(s)} />,
    <AskScreen key="a" thread={thread} lang={lang} t={t} asks={asks} speakingTurnId={spoken && tts.speaking ? spoken.turnId : null}
      onSend={(q) => askInThread(q)} onVoice={startListening} onRetry={retryTurn} onOffer={(o) => { const failed = [...thread.turns].reverse().find((tu) => tu.state === "error"); if (failed) acceptOffer(failed.id, o); }}
      onOpen={openAnswer} onWhy={openWhy} onEvidence={openEvidence} onListen={(e, id) => (tts.speaking ? stopSpeaking() : speakEnvelope(e, id))}
      onHistory={() => push("history")} onNew={startNewThread} />,
    <TripsScreen key="t" trips={trips} canAdd={!!(env ?? mapEnv)} lang={lang} t={t} onAdd={canPersist ? saveForTrip : needsAccount} />,
    <MyBoatScreen key="b" profile={profile} lang={lang} langNative={native} t={t}
      onSave={async (p) => { if (!canPersist) { needsAccount(); return; } await saveVesselProfile(p); setProfile(p); try { await session.updateProfile({ profile: { vessel: p } }); } catch { /* kept locally */ } }}
      onLanguage={() => push("language")} onTrips={() => setTab(TAB_TRIPS)} onOffline={() => push("offline")} onEmergency={() => push("emergency")}
      demoActive={demo !== null} onDemo={() => { setDemo((d) => (d === null ? 0 : null)); setWarnAcked(false); }} />,
  ][tab];

  // --- voice mode: full screen, tab bar hidden ------------------------------------------
  let voiceView: React.ReactNode = null;
  const voiceTurn = thread.turns[thread.turns.length - 1];
  if (voice === "listening") voiceView = <ListeningScreen lang={lang} t={t} partial={stt.partial} level={stt.level} startedAt={listenStart} onRelease={holdEnd} requesting={stt.state === "requesting"} message={stt.message} onAllow={() => stt.start()} onCancel={exitVoice} />;
  else if (voice === "checking" && voiceTurn) voiceView = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, minHeight: 0 }}><CheckingScreen query={voiceTurn.query} startedAt={new Date(voiceTurn.askedAt).getTime()} lang={lang} t={t} /></div>
      <div style={{ flex: "none", padding: "0 16px 16px", background: color.page }}><BigButton onClick={exitVoice}>{t("voiceExit")}</BigButton></div>
    </div>
  );
  else if (voice === "answer" && voiceTurn) voiceView = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: color.page }}>
      <div style={{ flex: "none", background: color.header, padding: "12px 16px", minHeight: 56, display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="mic" size={22} color={color.headerMuted} />
        <span style={{ ...sans(15, 500, 1.3), color: color.headerText, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{voiceTurn.query}</span>
      </div>
      <div className="orca-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {voiceTurn.state === "answer" && voiceTurn.envelope ? (
          <>
            {/* The spoken sentence, large, highlighted as it plays. */}
            {spoken && spoken.turnId === voiceTurn.id && (
              <div style={{ display: "flex", flexWrap: "wrap", fontSize: 0 }} aria-live="polite">
                {spoken.words.map((w, i) => (
                  <span key={i} style={{ ...sans(26, 500, 1.5), color: tts.speaking && i === spoken.idx ? color.seaDark : color.ink, background: tts.speaking && i === spoken.idx ? color.seaTint : "transparent", borderRadius: 5, padding: "1px 3px", marginRight: 5 }}>{w}</span>
                ))}
              </div>
            )}
            {voiceNote && <div style={{ ...sans(14, 400, 1.4), color: color.inkMuted }}>{voiceNote}</div>}
            <AnswerCard envelope={voiceTurn.envelope} lang={lang} t={t} onOpen={() => { setVoice(null); setTab(TAB_ASK); openAnswer(voiceTurn.envelope!); }} onWhy={() => { setVoice(null); setTab(TAB_ASK); openWhy(voiceTurn.envelope!); }} onEvidence={() => { setVoice(null); setTab(TAB_ASK); openEvidence(voiceTurn.envelope!); }}
              onListen={() => (tts.speaking ? stopSpeaking() : speakEnvelope(voiceTurn.envelope!, voiceTurn.id))} speaking={tts.speaking} />
          </>
        ) : (
          <EmptyState icon={<Icon name="alert" size={40} color={color.cautionChip} />} title={t("errorTitle")} body={t({ timeout: "errorTimeout", network: "errorNetwork", http: "errorHttp", no_backend: "errorNoBackend", cached_mode: "errorCachedModeBody" }[voiceTurn.error?.kind ?? "network"])}
            action={<BigButton variant="sea" onClick={() => retryTurn(voiceTurn)}>{t("retry")}</BigButton>} />
        )}
      </div>
      {/* The next turn, without touching the keyboard. */}
      <div style={{ flex: "none", padding: "10px 14px 16px", background: color.card, borderTop: `1px solid ${color.line}`, display: "flex", gap: 10 }}>
        <button onClick={exitVoice} style={{ ...btnReset, minWidth: touch.min, minHeight: touch.voice, borderRadius: 18, border: `1px solid ${color.lineStrong}`, ...sans(15, 600, 1), color: color.ink, padding: "0 14px" }}>{t("voiceType")}</button>
        <button onPointerDown={startListening} onPointerUp={holdEnd} onContextMenu={(e) => e.preventDefault()}
          style={{ ...btnReset, flex: 1, minHeight: touch.voice, borderRadius: 18, background: color.sea, color: color.headerText, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, touchAction: "none" }}>
          <Icon name="mic" size={26} color={color.headerText} /><span style={{ ...sans(18, 700, 1) }}>{t("voiceNext")}</span>
        </button>
      </div>
    </div>
  );

  // --- overlays on the current tab's stack ---------------------------------------------
  let overlay: React.ReactNode = null;
  const unknownCards = viewEnv?.cards?.filter((c) => !KNOWN_CARD_TYPES.has(c.type)) ?? [];
  if (top === "answer" && viewEnv) overlay = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", background: color.header, minHeight: 48, padding: "0 8px" }}>
        <button onClick={() => { stopSpeaking(); pop(); }} aria-label="back" style={{ ...btnReset, minWidth: 48, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={26} color={color.headerText} stroke={2.4} /></button>
        <span style={{ ...sans(15, 500, 1.2), color: color.headerMuted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewEnv.meta?.query_text}</span>
      </div>
      {viewEnv.meta?.cached && viewEnv.meta.cached_at && (
        <div style={{ flex: "none", padding: "8px 12px 0", background: color.page }}><StaleWarning savedAt={viewEnv.meta.cached_at} lang={lang} queryText={viewEnv.meta.query_text} /></div>
      )}
      {viewEnv.meta?.degraded && <div role="alert" style={{ flex: "none", background: color.cautionChip, color: color.cautionHeaderInk, ...sans(14, 600, 1.3), padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}><Icon name="alert" size={18} color={color.cautionHeaderInk} /><span>{t("degraded")}</span></div>}
      {unknownCards.length > 0 && <div style={{ flex: "none", background: color.cardMuted, color: color.inkMuted, ...sans(13, 500, 1.3), padding: "8px 16px" }}>{t("unsupportedCard")}: {unknownCards.map((c) => c.type).join(", ")}</div>}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AnswerScreen envelope={viewEnv} lang={lang} t={t} onWhy={() => push("why")} onEvidence={() => push("evidence")}
          onReplay={() => (tts.speaking ? stopSpeaking() : speakEnvelope(viewEnv, "view"))} spokenWordIndex={-1} speaking={tts.speaking} voiceUnavailableNote={voiceNote} cachedNote={null} />
      </div>
    </div>
  );
  else if (top === "why" && viewEnv) overlay = <WhyScreen envelope={viewEnv} lang={lang} t={t} onBack={pop} />;
  else if (top === "evidence" && viewEnv) overlay = <EvidenceScreen envelope={viewEnv} lang={lang} t={t} onBack={pop} />;
  else if (top === "alerts") overlay = <AlertsScreen alerts={dash.alerts as never} lang={lang} t={t} onReload={() => setDashNonce((n) => n + 1)} onBack={pop} />;
  else if (top === "history") overlay = <HistoryScreen threads={threads} currentId={thread.id} lang={lang} t={t} onBack={pop} onOpen={(th) => { reset(); stopSpeaking(); setThread(th); pop(); }} onDelete={async (id) => { const next = await deleteThread(id); setThreads(next); if (id === thread.id) setThread(newThread()); }} />;
  else if (top === "language") overlay = <LanguageScreen lang={lang} t={t} deviceVoices={tts.supported ? new Set(tts.supported) : null} onBack={pop} onPick={(l) => { setLang(l); pop(); }} />;
  else if (top === "offline") overlay = <OfflineScreen online={net.online} lastSyncAt={lastSavedAt} trip={trip} canSave={!!(env ?? mapEnv)} lang={lang} t={t} onSave={saveForTrip} onBack={pop} />;
  else if (top === "emergency") overlay = <EmergencyScreen position={geo.position} profile={profile} harbours={HARBOURS} lang={lang} t={t} onBack={pop} />;
  else if (top === "profile") overlay = (
    <ProfileScreen t={t} lang={lang} langNative={native} user={session.user} isGuest={isGuest} onboardingPending={session.onboardingPending} storageKind={session.storageKind}
      onBack={pop} onLanguage={() => push("language")} onBoat={() => { clearStack(); setTab(TAB_BOAT); }} onEmergency={() => push("emergency")} onOffline={() => push("offline")}
      onResumeOnboarding={() => push("onboarding")} onCreateAccount={async () => { await signOut(); setAuthScreen("signup"); }} onSignOut={signOut} />
  );
  else if (top === "onboarding") overlay = <OnboardingScreen t={t} lang={lang} position={position} initialVessel={profile} onLanguage={(l) => setLang(l)} onDone={finishOnboarding} />;
  else if (top === "needAccount") overlay = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: color.page }}>
      <EmptyState icon={<Icon name="boat" size={44} color={color.inkGhost} />} title={t("needAccount")} body={t("needAccountBody")}
        action={<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <BigButton variant="sea" onClick={async () => { await signOut(); setAuthScreen("signup"); }}>{t("createAccount")}</BigButton>
          <BigButton onClick={pop}>{t("cancel")}</BigButton>
        </div>} />
    </div>
  );

  const covered = voiceView ?? overlay;
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: color.page, fontFamily: "var(--font-sans), sans-serif", boxSizing: "border-box", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "env(safe-area-inset-top)", background: color.header }} />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, visibility: covered ? "hidden" : "visible" }}>{tabScreen}</div>
        {covered && <div style={{ position: "absolute", inset: 0, zIndex: 20 }}>{covered}</div>}
        {micNote && !covered && (
          <div role="status" style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: color.ink, color: color.headerText, borderRadius: 14, padding: "12px 14px", ...sans(15, 500, 1.35), zIndex: 30, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ flex: 1 }}>{micNote}</span>
            <button onClick={() => setMicNote(null)} style={{ ...btnReset, color: color.headerMuted, minWidth: 44, minHeight: 44 }}>✕</button>
          </div>
        )}
        {severe && geo.status && <BorderWarningOverlay status={geo.status} position={position} lang={lang} t={t} onAck={() => setWarnAcked(true)} />}
      </div>
      {!voiceView && (
        <nav style={{ flex: "none", height: 70, display: "flex", background: color.card, borderTop: `1px solid ${color.line}`, position: "relative" }}>
          {[t("tabToday"), tabs[1], tabs[0], tabs[2], tabs[3]].map((label, i) => {
            const on = tab === i;
            if (i === TAB_ASK) return (
              <button key="ask" onClick={() => setTab(TAB_ASK)} aria-current={on} aria-label={label} style={{ ...btnReset, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 6, gap: 4 }}>
                <span style={{ width: 62, height: 62, borderRadius: "50%", background: color.sea, boxShadow: "0 4px 14px rgba(11,107,125,.35)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -28, border: `4px solid ${color.card}` }}>
                  <Icon name="mic" size={28} color={color.headerText} stroke={2.4} />
                </span>
                <span style={{ ...sans(12, 700, 1), color: color.sea }}>{label}</span>
              </button>
            );
            return (
              <button key={label} onClick={() => setTab(i)} aria-current={on} style={{ ...btnReset, flex: 1, minHeight: touch.tab, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: on ? "#e6f2f4" : "transparent", color: on ? color.sea : color.inkFaint }}>
                <Icon name={TAB_ICONS[i]} size={22} color={on ? color.sea : color.inkFaint} />
                <span style={{ ...sans(12, on ? 700 : 500, 1) }}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}
      <span hidden>{localiseDigits("", lang)}</span>
    </div>
  );
}
