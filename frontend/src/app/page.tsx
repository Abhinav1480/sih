"use client";

/**
 * The app shell: four tabs, a stack of screens over them, one language, one
 * answer, one network status, one GPS watch.
 *
 * The state machine is the design's: Home -> Listening -> Checking -> Answer,
 * with Why and Evidence as doors off the answer. The hardware back button
 * pops the stack; with nothing to pop the app minimises.
 *
 * Nothing here judges the sea. Verdict wording and colour come from
 * lib/design/verdict.ts (a keyed lookup); numbers come from the envelope;
 * every visible string comes from the locale tables through t().
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { color, touch } from "@/lib/design/tokens";
import { ASKS, TABS } from "@/lib/i18n/app";
import { useLang } from "@/lib/i18n/useLang";
import { localiseDigits } from "@/lib/i18n/digits";
import { useAnalysis } from "@/lib/data/useAnalysis";
import { DEFAULT_LOCATION } from "@/lib/data/placeholders";
import { HARBOURS } from "@/lib/data/harbours";
import { KNOWN_CARD_TYPES, type Envelope } from "@/lib/contract/envelope";
import { useNetworkStatus } from "@/lib/offline/network";
import { formatAge, isStale, loadTripCard, loadTrips, loadVesselProfile, saveTrip, saveTripCard, saveVesselProfile, type VesselProfile } from "@/lib/offline/store";
import { buildTripCard, type TripCard } from "@/lib/offline/tripCard";
import { DEMO_TRACK, useGeofence } from "@/lib/geofence";
import { useSpeechInput, useSpeechOutput, buildSpokenText } from "@/lib/voice";
import type { OrcaAnalysisResponse } from "@/lib/types";
import { initNativeShell, registerBackHandler } from "@/lib/native";
import { Icon, btnReset, sans } from "@/components/app/primitives";
import { HomeScreen } from "@/components/app/screens/Home";
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
import { EmptyState, BigButton } from "@/components/app/primitives";
import { AppMap } from "@/components/app/AppMap";
import { StaleWarning } from "@/components/Offline/StaleWarning";
import { useSession } from "@/lib/auth/session";
import { isLangCode } from "@/lib/i18n/useLang";
import { SplashScreen, WelcomeScreen, SignUpScreen, SignInScreen, ForgotScreen } from "@/components/app/screens/Auth";
import { OnboardingScreen } from "@/components/app/screens/Onboarding";
import { ProfileScreen } from "@/components/app/screens/Profile";

type Overlay = "listening" | "checking" | "answer" | "why" | "evidence" | "language" | "offline" | "emergency" | "type" | "error" | "profile" | "onboarding" | "needAccount";
type AuthScreen = "welcome" | "signup" | "signin" | "forgot";

/** ponytail: the TTS plugin gives no word boundaries on Android, so the highlight runs on a clock at ~2.3 words/s (rate 0.9). */
const MS_PER_WORD = 430;
const TAB_ICONS = ["mic", "map", "list", "boat"] as const;

export default function AppPage() {
  const { lang, setLang, t, native, hasVoice: designVoice } = useLang();
  const { state, ask, showOffer, reset } = useAnalysis();
  const session = useSession();
  const [splashDone, setSplashDone] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("welcome");
  const net = useNetworkStatus();
  const [tab, setTab] = useState(0);
  const [stack, setStack] = useState<Overlay[]>([]);
  const [lastEnvelope, setLastEnvelope] = useState<Envelope | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<VesselProfile | null>(null);
  const [trip, setTrip] = useState<TripCard | null>(null);
  const [trips, setTrips] = useState<TripCard[] | null>(null);
  const [typed, setTyped] = useState("");
  const [micNote, setMicNote] = useState<string | null>(null);
  const [listenStart, setListenStart] = useState(0);
  const [demo, setDemo] = useState<number | null>(null); // index into DEMO_TRACK while the demo drive runs
  const [warnAcked, setWarnAcked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  const push = useCallback((o: Overlay) => setStack((s) => [...s, o]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const top = stack[stack.length - 1];

  // --- native shell, back button, persisted things ---------------------------
  useEffect(() => {
    setMounted(true);
    initNativeShell();
    loadVesselProfile().then(setProfile);
    loadTripCard().then(setTrip);
    loadTrips().then(setTrips);
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => registerBackHandler(() => {
    if (session.status === "signed_out") {
      if (authScreen === "welcome") return false;
      setAuthScreen("welcome");
      return true;
    }
    if (stack.length === 0) return false;
    if (top === "checking") reset();
    pop();
    return true;
  }), [stack.length, top, pop, reset, session.status, authScreen]);

  // --- GPS and the geofence; the demo drive replaces the fix when running -----
  const demoPos = demo !== null ? DEMO_TRACK[Math.min(demo, DEMO_TRACK.length - 1)] : null;
  const geo = useGeofence({ enabled: true, source: demo !== null ? "demo" : "gps", demoPosition: demoPos, onSevere: () => setWarnAcked(false) });
  useEffect(() => {
    if (demo === null) return;
    const id = setInterval(() => setDemo((i) => (i === null || i >= DEMO_TRACK.length - 1 ? i : i + 1)), 250);
    return () => clearInterval(id);
  }, [demo]);
  const position = geo.position ? { lat: geo.position.lat, lon: geo.position.lon } : null;
  const severe = geo.status?.level === "severe" && !warnAcked;

  // --- voice -----------------------------------------------------------------
  const tts = useSpeechOutput(lang);
  const [wordIdx, setWordIdx] = useState(-1);
  const wordTimer = useRef<number | null>(null);
  useEffect(() => { if (tts.supported) console.log("[tts] getSupportedLanguages()", tts.supported); }, [tts.supported]);

  const speakEnvelope = useCallback(async (env: Envelope) => {
    const spoken = buildSpokenText(env as unknown as OrcaAnalysisResponse, lang);
    const words = (env.answer?.narrative ?? "").split(/\s+/).filter(Boolean).length;
    setWordIdx(0);
    if (wordTimer.current) window.clearInterval(wordTimer.current);
    wordTimer.current = window.setInterval(() => setWordIdx((i) => (i + 1 >= words ? i : i + 1)), MS_PER_WORD);
    const r = await tts.speak(spoken.text);
    if (wordTimer.current) window.clearInterval(wordTimer.current);
    setWordIdx(-1);
    return r;
  }, [lang, tts]);

  const runQuery = useCallback((q: string) => {
    const loc = position ?? DEFAULT_LOCATION;
    setStack(["checking"]);
    ask(q, { latitude: loc.lat, longitude: loc.lon });
  }, [ask, position]);

  const stt = useSpeechInput({ lang, onFinal: (text) => { if (text.trim()) runQuery(text.trim()); else { setMicNote(t("micNoMatch")); setStack([]); } } });
  /** Finger lifted: hand over what was heard; if nothing was started, just close. Permission asks stay up. */
  const holdEnd = useCallback(() => {
    if (stt.state === "listening" || stt.state === "processing") { stt.start(); return; } // start() while listening = finalise
    if (stt.state === "requesting") return;
    stt.stop(); setStack([]);
  }, [stt]);
  // Only a state the recogniser reached *during this hold* may close the screen; the
  // terminal state left over from the previous hold (e.g. "nomatch") must not.
  const holdStartState = useRef<string | null>(null);
  useEffect(() => {
    if (top !== "listening") return;
    if (stt.state === holdStartState.current) return;
    holdStartState.current = null;
    if (stt.state === "denied") { setMicNote(t("micDenied")); setStack([]); }
    else if (stt.state === "unavailable" || stt.state === "error") { setMicNote(t("micUnavailable")); setStack([]); }
    else if (stt.state === "nomatch") { setMicNote(t("micNoMatch")); setStack([]); }
  }, [stt.state, top, t]);

  // --- the answer lands ---------------------------------------------------------
  useEffect(() => {
    if (state.phase === "answer") {
      setLastEnvelope(state.envelope);
      setLastSavedAt(state.source === "live" ? new Date().toISOString() : state.savedAt);
      setStack(["answer"]);
      if (tts.hasVoice) speakEnvelope(state.envelope);
    } else if (state.phase === "error") {
      setStack(["error"]);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const env = state.phase === "answer" ? state.envelope : lastEnvelope;
  const cachedNote = useMemo(() => {
    if (!env?.meta?.cached) return null;
    if (state.phase === "answer" && state.source === "bundled") return t("bundledNote");
    return `${t("cachedFrom")} ${env.meta.cached_at ? localiseDigits(formatAge(env.meta.cached_at, lang), lang) : ""}`.trim();
  }, [env, state, t, lang]);
  const syncLabel = lastSavedAt ? localiseDigits(formatAge(lastSavedAt, lang), lang) : t("offline.neverSynced");
  const stale = !!lastSavedAt && isStale(lastSavedAt);
  void now;

  const unknownCards = env?.cards?.filter((c) => !KNOWN_CARD_TYPES.has(c.type)) ?? [];
  // The map opens on the sea the answer is about (or the bundled coast), with the phone's fix as a
  // marker. Centring on the fix put an inland tester on a blank, unbundled view.
  const mapCenter = useMemo(() => {
    const loc = env?.meta?.location;
    return loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude) ? { lat: loc.latitude, lon: loc.longitude } : DEFAULT_LOCATION;
  }, [env]);
  const asks = ((ASKS as Record<string, readonly string[]>)[lang] ?? ASKS.en).slice();

  const saveForTrip = useCallback(async () => {
    if (!env) return;
    const card = buildTripCard(env as unknown as OrcaAnalysisResponse);
    await saveTripCard(card);
    setTrip(card);
    setTrips(await saveTrip(card));
  }, [env]);

  const voiceNote = !designVoice || !tts.hasVoice ? t("listenNoVoice") : null;

  // --- entrance -----------------------------------------------------------------
  const isGuest = session.status === "guest";
  const canPersist = session.status === "signed_in";
  const needsAccount = useCallback(() => push("needAccount"), [push]);

  const finishOnboarding = useCallback(async (r: { language: string; harbour: { name: string; lat: number; lon: number } | null; vessel: VesselProfile | null }) => {
    if (r.vessel) { await saveVesselProfile(r.vessel); setProfile(r.vessel); }
    if (canPersist) {
      const profilePatch: Record<string, unknown> = {};
      if (r.harbour) profilePatch.home_harbour = r.harbour;
      if (r.vessel) profilePatch.vessel = r.vessel;
      try { await session.updateProfile({ preferred_language: r.language, ...(Object.keys(profilePatch).length ? { profile: profilePatch } : {}) }); } catch { /* offline: kept locally, synced when the profile is next saved */ }
    }
    await session.finishOnboarding();
    setStack([]);
  }, [canPersist, session]);

  // --- render -------------------------------------------------------------------
  if (!mounted || !splashDone || session.status === "loading") {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }
  if (session.status === "signed_out") {
    // Same edge-to-edge frame as the app: the status bar sits over the header colour.
    const frame = (child: React.ReactNode) => (
      <div style={{ position: "fixed", inset: 0, background: color.header, boxSizing: "border-box", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>{child}</div>
    );
    if (authScreen === "signup") return frame(<SignUpScreen t={t} lang={lang} onBack={() => setAuthScreen("welcome")} onSignIn={() => setAuthScreen("signin")}
      onSubmit={async (id, pw, name, language) => { await session.signUp(id, pw, name, language); if (isLangCode(language)) setLang(language); setStack(["onboarding"]); }} />);
    if (authScreen === "signin") return frame(<SignInScreen t={t} onBack={() => setAuthScreen("welcome")} onForgot={() => setAuthScreen("forgot")} onSignUp={() => setAuthScreen("signup")}
      onSubmit={async (id, pw) => { const u = await session.signIn(id, pw); if (isLangCode(u.preferred_language)) setLang(u.preferred_language); setStack([]); }} />);
    if (authScreen === "forgot") return frame(<ForgotScreen t={t} onBack={() => setAuthScreen("signin")} onGuest={() => session.continueAsGuest()} />);
    return frame(<WelcomeScreen t={t} onGuest={() => session.continueAsGuest()} onSignIn={() => setAuthScreen("signin")} onSignUp={() => setAuthScreen("signup")} />);
  }
  const tabScreen = [
    <HomeScreen key="h" envelope={env} cachedNote={cachedNote} online={net.online} syncLabel={syncLabel} stale={stale} stripLabel={stale ? t("offline.stale") : net.online ? t("online") : t("offline")}
      lang={lang} langNative={native} t={t} asks={asks}
      onAsk={runQuery} onHoldStart={() => { setMicNote(null); setListenStart(Date.now()); holdStartState.current = stt.state; push("listening"); stt.start(); }} onHoldEnd={holdEnd} onType={() => push("type")}
      onLanguage={() => push("language")} onProfile={() => push("profile")} avatar={session.user ? session.user.name.trim().charAt(0).toUpperCase() : null} onOpenAnswer={() => push("answer")}
      map={<MapScreenLite envelope={env} position={position} center={mapCenter} lang={lang} t={t} />} />,
    <MapScreen key="m" envelope={env} position={position} center={mapCenter} lang={lang} t={t} onSpeak={(s) => tts.speak(s)} />,
    <TripsScreen key="t" trips={trips} canAdd={!!env} lang={lang} t={t} onAdd={canPersist ? saveForTrip : needsAccount} />,
    <MyBoatScreen key="b" profile={profile} lang={lang} langNative={native} t={t}
      onSave={async (p) => { if (!canPersist) { needsAccount(); return; } await saveVesselProfile(p); setProfile(p); try { await session.updateProfile({ profile: { vessel: p } }); } catch { /* kept locally */ } }}
      onLanguage={() => push("language")} onTrips={() => setTab(2)} onOffline={() => push("offline")} onEmergency={() => push("emergency")}
      demoActive={demo !== null} onDemo={() => { setDemo((d) => (d === null ? 0 : null)); setWarnAcked(false); }} />,
  ][tab];

  let overlay: React.ReactNode = null;
  if (top === "listening") overlay = <ListeningScreen lang={lang} t={t} partial={stt.partial} level={stt.level} startedAt={listenStart} onRelease={holdEnd} requesting={stt.state === "requesting"} message={stt.message} onAllow={() => stt.start()} onCancel={() => { stt.stop(); setStack([]); }} />;
  else if (top === "checking" && state.phase === "checking") overlay = <CheckingScreen query={state.query} startedAt={state.startedAt} lang={lang} t={t} />;
  else if (top === "answer" && env) overlay = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", background: color.header, minHeight: 48, padding: "0 8px" }}>
        <button onClick={() => { tts.stop(); setStack([]); }} aria-label="back" style={{ ...btnReset, minWidth: 48, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="back" size={26} color={color.headerText} stroke={2.4} /></button>
        <span style={{ ...sans(15, 500, 1.2), color: color.headerMuted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{env.meta?.query_text}</span>
      </div>
      {env.meta?.cached && env.meta.cached_at && (
        <div style={{ flex: "none", padding: "8px 12px 0", background: color.page }}>
          <StaleWarning savedAt={env.meta.cached_at} lang={lang} queryText={env.meta.query_text} />
        </div>
      )}
      {env.meta?.degraded && <div role="alert" style={{ flex: "none", background: color.cautionChip, color: color.cautionHeaderInk, ...sans(14, 600, 1.3), padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}><Icon name="alert" size={18} color={color.cautionHeaderInk} /><span>{t("degraded")}</span></div>}
      {unknownCards.length > 0 && <div style={{ flex: "none", background: color.cardMuted, color: color.inkMuted, ...sans(13, 500, 1.3), padding: "8px 16px" }}>{t("unsupportedCard")}: {unknownCards.map((c) => c.type).join(", ")}</div>}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AnswerScreen envelope={env} lang={lang} t={t} onWhy={() => push("why")} onEvidence={() => push("evidence")}
          onReplay={() => speakEnvelope(env)} spokenWordIndex={wordIdx} speaking={tts.speaking} voiceUnavailableNote={voiceNote} cachedNote={null} />
      </div>
    </div>
  );
  else if (top === "why" && env) overlay = <WhyScreen envelope={env} lang={lang} t={t} onBack={pop} />;
  else if (top === "evidence" && env) overlay = <EvidenceScreen envelope={env} lang={lang} t={t} onBack={pop} />;
  else if (top === "language") overlay = <LanguageScreen lang={lang} t={t} deviceVoices={tts.supported ? new Set(tts.supported) : null} onBack={pop} onPick={(l) => { setLang(l); pop(); }} />;
  else if (top === "offline") overlay = <OfflineScreen online={net.online} lastSyncAt={lastSavedAt} trip={trip} canSave={!!env} lang={lang} t={t} onSave={saveForTrip} onBack={pop} />;
  else if (top === "emergency") overlay = <EmergencyScreen position={geo.position} profile={profile} harbours={HARBOURS} lang={lang} t={t} onBack={pop} />;
  else if (top === "error" && state.phase === "error") overlay = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: color.page }}>
      <div style={{ flex: "none", background: color.header, padding: "13px 16px", minHeight: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { reset(); setStack([]); }} aria-label="back" style={{ ...btnReset, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", margin: "-8px 0 -8px -8px" }}><Icon name="back" size={26} color={color.headerText} stroke={2.4} /></button>
        <span style={{ ...sans(15, 500, 1.2), color: color.headerMuted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.query}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Icon name="alert" size={44} color={color.cautionChip} />
        <div style={{ ...sans(22, 600, 1.3), color: color.ink }}>{t(state.kind === "cached_mode" ? "errorCachedMode" : "errorTitle")}</div>
        <div style={{ ...sans(15, 400, 1.45), color: color.inkMuted }}>
          {t({ timeout: "errorTimeout", network: "errorNetwork", http: "errorHttp", no_backend: "errorNoBackend", cached_mode: "errorCachedModeBody" }[state.kind])}
          {state.detail ? <span className="num"> ({state.detail})</span> : null}
        </div>
        {state.kind !== "cached_mode" && <BigButton variant="sea" minHeight={touch.answerAction} onClick={() => runQuery(state.query)}>{t("retry")}</BigButton>}
        {/* What the phone holds, offered by name. Nothing below is this question's answer. */}
        {state.offers.length > 0 && <div style={{ ...sans(13, 600, 1, ".06em"), color: color.inkFaint, textTransform: "uppercase", marginTop: 10 }}>{t("offersTitle")}</div>}
        {state.offers.map((o) => (
          <button key={o.source} onClick={() => showOffer(o)} style={{ ...btnReset, textAlign: "left", border: `1px solid ${color.cautionBorder}`, background: color.cautionBg, borderRadius: 16, padding: "12px 14px", minHeight: touch.min, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ ...sans(13, 600, 1), color: color.cautionText }}>{t(o.source === "cached" ? "offerSaved" : "offerExample")} · <span className="num">{localiseDigits(formatAge(o.savedAt, lang), lang)}</span></span>
            <span style={{ ...sans(16, 500, 1.35), color: color.ink, fontStyle: "italic" }}>&ldquo;{o.query}&rdquo;</span>
          </button>
        ))}
        <BigButton onClick={() => { reset(); setStack([]); }}>{t("goHome")}</BigButton>
      </div>
    </div>
  );
  else if (top === "profile") overlay = (
    <ProfileScreen t={t} lang={lang} langNative={native} user={session.user} isGuest={isGuest} onboardingPending={session.onboardingPending} storageKind={session.storageKind}
      onBack={pop} onLanguage={() => push("language")} onBoat={() => { setStack([]); setTab(3); }} onEmergency={() => push("emergency")} onOffline={() => push("offline")}
      onResumeOnboarding={() => push("onboarding")} onCreateAccount={async () => { await session.signOut(); setAuthScreen("signup"); setStack([]); }}
      onSignOut={async () => { tts.stop(); reset(); setStack([]); setTab(0); setLastEnvelope(null); setLastSavedAt(null); await session.signOut(); setAuthScreen("welcome"); }} />
  );
  else if (top === "onboarding") overlay = (
    <OnboardingScreen t={t} lang={lang} position={position} initialVessel={profile} onLanguage={(l) => setLang(l)} onDone={finishOnboarding} />
  );
  else if (top === "needAccount") overlay = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: color.page }}>
      <EmptyState icon={<Icon name="boat" size={44} color={color.inkGhost} />} title={t("needAccount")} body={t("needAccountBody")}
        action={<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <BigButton variant="sea" onClick={async () => { await session.signOut(); setAuthScreen("signup"); setStack([]); }}>{t("createAccount")}</BigButton>
          <BigButton onClick={pop}>{t("cancel")}</BigButton>
        </div>} />
    </div>
  );
  else if (top === "type") overlay = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: color.page }}>
      <div style={{ flex: "none", background: color.header, padding: "13px 16px", minHeight: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={pop} aria-label="back" style={{ ...btnReset, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", margin: "-8px 0 -8px -8px" }}><Icon name="back" size={26} color={color.headerText} stroke={2.4} /></button>
        <span style={{ ...sans(18, 600, 1), color: color.headerText }}>{t("typeTitle")}</span>
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("typePlaceholder")} rows={3} autoFocus
          style={{ ...sans(20, 500, 1.4), color: color.ink, borderRadius: 16, border: `1px solid ${color.lineStrong}`, padding: 14, background: color.card, resize: "none" }} />
        <BigButton variant="sea" minHeight={touch.voice} disabled={!typed.trim()} onClick={() => { const q = typed.trim(); setTyped(""); runQuery(q); }} style={{ justifyContent: "center" }}><span style={{ textAlign: "center", display: "block" }}>{t("send")}</span></BigButton>
        {asks.map((q) => <button key={q} onClick={() => runQuery(q)} style={{ ...btnReset, minHeight: touch.min, borderRadius: 999, border: `1px solid ${color.lineSoft}`, background: color.card, ...sans(16, 500, 1.2), color: color.ink, padding: "0 18px", textAlign: "left" }}>{q}</button>)}
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: color.page, fontFamily: "var(--font-sans), sans-serif", boxSizing: "border-box", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* The status bar sits over the header colour, edge to edge. */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "env(safe-area-inset-top)", background: color.header }} />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, visibility: overlay ? "hidden" : "visible" }}>{tabScreen}</div>
        {overlay && <div style={{ position: "absolute", inset: 0, zIndex: 20 }}>{overlay}</div>}
        {micNote && !overlay && (
          <div role="status" style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: color.ink, color: color.headerText, borderRadius: 14, padding: "12px 14px", ...sans(15, 500, 1.35), zIndex: 30, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ flex: 1 }}>{micNote}</span>
            <button onClick={() => setMicNote(null)} style={{ ...btnReset, color: color.headerMuted, minWidth: 44, minHeight: 44 }}>✕</button>
          </div>
        )}
        {severe && geo.status && <BorderWarningOverlay status={geo.status} position={position} lang={lang} t={t} onAck={() => setWarnAcked(true)} />}
      </div>
      {!overlay && (
        <nav style={{ flex: "none", height: 70, display: "flex", background: color.card, borderTop: `1px solid ${color.line}` }}>
          {((TABS as Record<string, readonly string[]>)[lang] ?? TABS.en).map((label, i) => {
            const on = tab === i;
            return (
              <button key={label} onClick={() => setTab(i)} aria-current={on} style={{ ...btnReset, flex: 1, minHeight: touch.tab, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: on ? "#e6f2f4" : "transparent", color: on ? color.sea : color.inkFaint }}>
                <Icon name={TAB_ICONS[i]} size={22} color={on ? color.sea : color.inkFaint} />
                <span style={{ ...sans(12, on ? 700 : 500, 1) }}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** The Home map: the answer's layers and the phone's position, no controls. Tap goes to the Map tab. */
function MapScreenLite({ envelope, position, center, lang, t }: { envelope: Envelope | null; position: { lat: number; lon: number } | null; center: { lat: number; lon: number }; lang: string; t: (k: string) => string }) {
  void lang;
  const layers = envelope?.layers ?? [];
  const visible = layers.map((l) => l.visible_by_default !== false);
  const zones: never[] = [];
  return (
    <>
      <AppMap center={center} layers={layers} visible={visible} zones={zones} position={position} />
      {!envelope && <div style={{ position: "absolute", left: 12, bottom: 12, right: 12, ...sans(13, 500, 1.3), color: color.inkMuted, background: "rgba(255,255,255,.9)", borderRadius: 10, padding: "8px 10px", zIndex: 500 }}>{t("layersHint")}</div>}
    </>
  );
}
