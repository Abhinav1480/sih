/**
 * The only place spoken text is produced.
 *
 * `buildSpokenScript` reads the response and nothing else. Every sentence it
 * emits is a template filled from a field that exists in that response, and
 * it emits nothing for a field that is absent: no route means no route
 * sentence, no zones means no zone sentence, no `risk` block means no band
 * and no score. The validity time is spoken as "valid until", which is what
 * `meta.temporal.end_time` means; it is never a time to return by.
 *
 * Verdict first, then the numbers. Templates are per language and shorter
 * than the written answer. Numbers are spoken with Latin digits so every
 * speech engine reads them; the on-screen subtitle transliterates them into
 * the reader's numerals. Nothing here is machine-translated at speak time.
 *
 * This module is deliberately dependency-free (type imports only) so its
 * test runs under plain Node against the real captures.
 */
import type { Envelope, EvidenceRecord } from "../types";

export type SpokenLang = "en" | "te" | "ta" | "hi";

export interface SpokenSentence {
  /** Dotted path of the field(s) the sentence came from. */
  key: string;
  text: string;
}

export interface SpokenScript {
  lang: SpokenLang;
  sentences: SpokenSentence[];
  text: string;
}

export interface SpokenOptions {
  /** `answer` for a turn, `greeting` for the page-open greeting built from the dashboard fetch. */
  kind?: "answer" | "greeting";
  /** The user's home harbour name, for the greeting. Comes from their profile, not from a measurement. */
  placeName?: string | null;
}

type Templates = {
  greetingName: string;
  greeting: string;
  greetingCall: string;
  greetingHelp: string;
  verdict: Record<"GO" | "CAUTION" | "NO_GO" | "NOT_APPLICABLE", string>;
  band: Record<"LOW" | "MODERATE" | "HIGH" | "SEVERE", string>;
  score: string;
  waves: string;
  wind: string;
  observed: string;
  forecast: string;
  synthetic: string;
  advisory: string;
  zonesCount: string;
  bestZone: string;
  route: string;
  routeCrosses: string;
  routeClear: string;
  geofence: string;
  validUntil: string;
  degraded: string;
  clarify: string;
  offer: string;
  units: Record<string, string>;
};

export const TEMPLATES: Record<SpokenLang, Templates> = {
  en: {
    greetingName: "Welcome back, {name}.",
    greeting: "Welcome.",
    greetingCall: "The sea near {place}: {verdict}.",
    greetingHelp: "How can I help you?",
    verdict: {
      GO: "You can go.",
      CAUTION: "Go with caution.",
      NO_GO: "Do not go out.",
      NOT_APPLICABLE: "This question has no go or no-go call.",
    },
    band: { LOW: "Risk is low.", MODERATE: "Risk is moderate.", HIGH: "Risk is high.", SEVERE: "Risk is severe." },
    score: "Risk score {score} out of 100.",
    waves: "Waves about {value} {unit}, {when}.",
    wind: "Wind {value} {unit}, {when}.",
    observed: "observed {time}",
    forecast: "forecast for {time}",
    synthetic: "a synthetic value for {time}",
    advisory: "{severity} advisory: {title}. Issued by {source}.",
    zonesCount: "{n} fishing zones were ranked.",
    bestZone: "The best is {name}, {distance} kilometres away, bearing {bearing} degrees.",
    route: "Route from {origin} to {destination}: {distance} kilometres, about {hours} hours, {band} risk.",
    routeCrosses: "It crosses protected waters.",
    routeClear: "It does not cross protected waters.",
    geofence: "Warning: {zone} is a restricted zone. {detail}",
    validUntil: "This answer is valid until {time}.",
    degraded: "Some values came from a fallback source. Check the evidence.",
    clarify: "{question}",
    offer: "Ask me something else whenever you are ready.",
    units: { m: "metres", knots: "knots", kt: "knots" },
  },
  te: {
    greetingName: "మళ్లీ స్వాగతం, {name}.",
    greeting: "స్వాగతం.",
    greetingCall: "{place} దగ్గర సముద్రం: {verdict}.",
    greetingHelp: "నేను ఎలా సహాయం చేయగలను?",
    verdict: {
      GO: "వెళ్లొచ్చు.",
      CAUTION: "జాగ్రత్తగా వెళ్లండి.",
      NO_GO: "సముద్రంలోకి వెళ్లవద్దు.",
      NOT_APPLICABLE: "ఈ ప్రశ్నకు వెళ్లాలా వద్దా అనే నిర్ణయం లేదు.",
    },
    band: { LOW: "ప్రమాదం తక్కువ.", MODERATE: "ప్రమాదం మధ్యస్థం.", HIGH: "ప్రమాదం ఎక్కువ.", SEVERE: "ప్రమాదం చాలా ఎక్కువ." },
    score: "ప్రమాద స్కోరు 100 లో {score}.",
    waves: "అలలు సుమారు {value} {unit}, {when}.",
    wind: "గాలి {value} {unit}, {when}.",
    observed: "{time} న పరిశీలించినది",
    forecast: "{time} కు అంచనా",
    synthetic: "{time} కు కృత్రిమ విలువ",
    advisory: "{severity} సలహా: {title}. జారీ చేసినది {source}.",
    zonesCount: "{n} చేపల జోన్లు ర్యాంక్ చేయబడ్డాయి.",
    bestZone: "ఉత్తమమైనది {name}, {distance} కిలోమీటర్ల దూరంలో, {bearing} డిగ్రీల దిక్కులో.",
    route: "{origin} నుండి {destination} వరకు మార్గం: {distance} కిలోమీటర్లు, సుమారు {hours} గంటలు, {band} ప్రమాదం.",
    routeCrosses: "ఇది రక్షిత జలాలను దాటుతుంది.",
    routeClear: "ఇది రక్షిత జలాలను దాటదు.",
    geofence: "హెచ్చరిక: {zone} నిషేధిత ప్రాంతం. {detail}",
    validUntil: "ఈ సమాధానం {time} వరకు చెల్లుతుంది.",
    degraded: "కొన్ని విలువలు ప్రత్యామ్నాయ మూలం నుండి వచ్చాయి. ఆధారాలు చూడండి.",
    clarify: "{question}",
    offer: "సిద్ధమైనప్పుడు ఇంకేదైనా అడగండి.",
    units: { m: "మీటర్లు", knots: "నాట్లు", kt: "నాట్లు" },
  },
  ta: {
    greetingName: "மீண்டும் வரவேற்கிறோம், {name}.",
    greeting: "வரவேற்கிறோம்.",
    greetingCall: "{place} அருகே கடல்: {verdict}.",
    greetingHelp: "நான் எப்படி உதவலாம்?",
    verdict: {
      GO: "செல்லலாம்.",
      CAUTION: "கவனமாகச் செல்லுங்கள்.",
      NO_GO: "கடலுக்குச் செல்ல வேண்டாம்.",
      NOT_APPLICABLE: "இந்தக் கேள்விக்குச் செல்லலாமா வேண்டாமா என்ற முடிவு இல்லை.",
    },
    band: { LOW: "ஆபத்து குறைவு.", MODERATE: "ஆபத்து மிதம்.", HIGH: "ஆபத்து அதிகம்.", SEVERE: "ஆபத்து கடுமை." },
    score: "ஆபத்து மதிப்பெண் 100 இல் {score}.",
    waves: "அலைகள் சுமார் {value} {unit}, {when}.",
    wind: "காற்று {value} {unit}, {when}.",
    observed: "{time} அன்று கவனிக்கப்பட்டது",
    forecast: "{time} க்கான முன்னறிவிப்பு",
    synthetic: "{time} க்கான செயற்கை மதிப்பு",
    advisory: "{severity} அறிவுரை: {title}. வெளியிட்டது {source}.",
    zonesCount: "{n} மீன்பிடி மண்டலங்கள் தரவரிசைப்படுத்தப்பட்டன.",
    bestZone: "சிறந்தது {name}, {distance} கிலோமீட்டர் தொலைவில், {bearing} டிகிரி திசையில்.",
    route: "{origin} இலிருந்து {destination} வரை வழி: {distance} கிலோமீட்டர், சுமார் {hours} மணி நேரம், {band} ஆபத்து.",
    routeCrosses: "இது பாதுகாக்கப்பட்ட நீரைக் கடக்கிறது.",
    routeClear: "இது பாதுகாக்கப்பட்ட நீரைக் கடக்கவில்லை.",
    geofence: "எச்சரிக்கை: {zone} தடைசெய்யப்பட்ட மண்டலம். {detail}",
    validUntil: "இந்தப் பதில் {time} வரை செல்லும்.",
    degraded: "சில மதிப்புகள் மாற்று மூலத்திலிருந்து வந்தன. ஆதாரத்தைப் பாருங்கள்.",
    clarify: "{question}",
    offer: "தயாரானதும் வேறு எதையும் கேளுங்கள்.",
    units: { m: "மீட்டர்", knots: "நாட்", kt: "நாட்" },
  },
  hi: {
    greetingName: "फिर से स्वागत है, {name}.",
    greeting: "स्वागत है.",
    greetingCall: "{place} के पास समुद्र: {verdict}.",
    greetingHelp: "मैं कैसे मदद करूँ?",
    verdict: {
      GO: "जा सकते हैं.",
      CAUTION: "सावधानी से जाएँ.",
      NO_GO: "समुद्र में न जाएँ.",
      NOT_APPLICABLE: "इस सवाल के लिए जाने या न जाने का निर्णय नहीं है.",
    },
    band: { LOW: "खतरा कम है.", MODERATE: "खतरा मध्यम है.", HIGH: "खतरा अधिक है.", SEVERE: "खतरा बहुत अधिक है." },
    score: "जोखिम स्कोर 100 में से {score}.",
    waves: "लहरें लगभग {value} {unit}, {when}.",
    wind: "हवा {value} {unit}, {when}.",
    observed: "{time} को देखा गया",
    forecast: "{time} के लिए पूर्वानुमान",
    synthetic: "{time} के लिए कृत्रिम मान",
    advisory: "{severity} सलाह: {title}. जारीकर्ता {source}.",
    zonesCount: "{n} मछली क्षेत्र क्रमबद्ध किए गए.",
    bestZone: "सबसे अच्छा {name}, {distance} किलोमीटर दूर, {bearing} डिग्री दिशा में.",
    route: "{origin} से {destination} तक मार्ग: {distance} किलोमीटर, लगभग {hours} घंटे, {band} जोखिम.",
    routeCrosses: "यह संरक्षित जल पार करता है.",
    routeClear: "यह संरक्षित जल पार नहीं करता.",
    geofence: "चेतावनी: {zone} प्रतिबंधित क्षेत्र है. {detail}",
    validUntil: "यह उत्तर {time} तक मान्य है.",
    degraded: "कुछ मान वैकल्पिक स्रोत से आए. प्रमाण देखें.",
    clarify: "{question}",
    offer: "जब तैयार हों, कुछ और पूछें.",
    units: { m: "मीटर", knots: "नॉट", kt: "नॉट" },
  },
};

const SEVERITY_WORD: Record<SpokenLang, Record<string, string>> = {
  en: { INFO: "Information", CAUTION: "Caution", WARNING: "Warning", SEVERE: "Severe" },
  te: { INFO: "సమాచార", CAUTION: "జాగ్రత్త", WARNING: "హెచ్చరిక", SEVERE: "తీవ్ర" },
  ta: { INFO: "தகவல்", CAUTION: "எச்சரிக்கை", WARNING: "அபாய", SEVERE: "கடும்" },
  hi: { INFO: "सूचना", CAUTION: "सावधानी", WARNING: "चेतावनी", SEVERE: "गंभीर" },
};

const BAND_WORD: Record<SpokenLang, Record<string, string>> = {
  en: { LOW: "low", MODERATE: "moderate", HIGH: "high", SEVERE: "severe" },
  te: { LOW: "తక్కువ", MODERATE: "మధ్యస్థ", HIGH: "ఎక్కువ", SEVERE: "తీవ్ర" },
  ta: { LOW: "குறைந்த", MODERATE: "மிதமான", HIGH: "அதிக", SEVERE: "கடுமையான" },
  hi: { LOW: "कम", MODERATE: "मध्यम", HIGH: "अधिक", SEVERE: "गंभीर" },
};

const LOCALE: Record<SpokenLang, string> = { en: "en-IN", te: "te-IN", ta: "ta-IN", hi: "hi-IN" };

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

function isFinite_(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Round for speech without inventing precision: at most `digits` decimals, trailing zeros dropped. */
function spokenNumber(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)));
}

/** Parse the first number out of an evidence value like "24.0 kt (Gusts: 32.4 kt)". Null if none. */
function leadingNumber(value: string): number | null {
  const m = /-?\d+(?:\.\d+)?/.exec(value);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** "2026-09-08 12:24 UTC" or ISO. Null if it does not parse. */
function parseTime(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0));
    if (Number.isFinite(d.getTime())) return d;
  }
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function spokenTime(s: string | null | undefined, lang: SpokenLang): string | null {
  const d = parseTime(s);
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(d);
  } catch {
    return null;
  }
}

function whenClause(e: EvidenceRecord, T: Templates, lang: SpokenLang): string | null {
  const time = spokenTime(e.observation_or_forecast_time, lang);
  if (!time) return null;
  switch (e.status) {
    case "LIVE": case "CACHED": case "HISTORICAL": return fill(T.observed, { time });
    case "FORECAST": return fill(T.forecast, { time });
    case "DEMO": return fill(T.synthetic, { time });
    default: return null;
  }
}

function conditionSentence(e: EvidenceRecord | undefined, template: string, digits: number, T: Templates, lang: SpokenLang, key: string): SpokenSentence | null {
  if (!e) return null;
  const n = leadingNumber(e.value);
  const unit = T.units[e.unit];
  const when = whenClause(e, T, lang);
  if (n === null || !unit || !when) return null;
  return { key, text: fill(template, { value: spokenNumber(n, digits), unit, when }) };
}

export function buildSpokenScript(
  response: Envelope | null | undefined,
  lang: SpokenLang,
  userName: string | null | undefined,
  opts: SpokenOptions = {},
): SpokenScript {
  const T = TEMPLATES[lang] ?? TEMPLATES.en;
  const out: SpokenSentence[] = [];
  const kind = opts.kind ?? "answer";

  if (kind === "greeting") {
    out.push(userName ? { key: "user.name", text: fill(T.greetingName, { name: userName }) } : { key: "greeting", text: T.greeting });
    const verdict = response?.answer?.verdict;
    if (response && opts.placeName && verdict && verdict in T.verdict) {
      const v = T.verdict[verdict as keyof Templates["verdict"]].replace(/[.。]$/, "");
      out.push({ key: "answer.verdict", text: fill(T.greetingCall, { place: opts.placeName, verdict: v }) });
    }
    const wave = response ? findEvidence(response, /wave height/i) : undefined;
    const ws = conditionSentence(wave, T.waves, 1, T, lang, "evidence.wave");
    if (ws) out.push(ws);
    out.push({ key: "greeting.help", text: T.greetingHelp });
    return finish(lang, out);
  }

  if (!response) return finish(lang, out);

  if (response.intent === "needs_clarification" && response.answer?.headline) {
    out.push({ key: "answer.headline", text: fill(T.clarify, { question: response.answer.headline }) });
    return finish(lang, out);
  }

  // 1. Verdict first.
  const verdict = response.answer?.verdict;
  if (verdict && verdict in T.verdict) out.push({ key: "answer.verdict", text: T.verdict[verdict as keyof Templates["verdict"]] });

  // 2. Band and score, only when a risk block exists.
  const risk = response.risk;
  if (risk) {
    if (risk.band in T.band) out.push({ key: "risk.band", text: T.band[risk.band as keyof Templates["band"]] });
    if (isFinite_(risk.score)) out.push({ key: "risk.score", text: fill(T.score, { score: spokenNumber(risk.score, 0) }) });
  }

  // 3. Conditions, each from its own evidence record, with when it was observed.
  const ws = conditionSentence(findEvidence(response, /wave height/i), T.waves, 1, T, lang, "evidence.wave");
  if (ws) out.push(ws);
  const wd = conditionSentence(findEvidence(response, /wind/i), T.wind, 0, T, lang, "evidence.wind");
  if (wd) out.push(wd);

  // 4. Advisories, attributed to whoever issued them.
  for (const a of response.alerts ?? []) {
    if (!a.title || !a.source) continue;
    const severity = SEVERITY_WORD[lang][a.severity] ?? a.severity;
    out.push({ key: `alerts.${a.id}`, text: fill(T.advisory, { severity, title: a.title, source: a.source }) });
  }

  // 5. Zones, only if the response ranks any.
  const pfz = response.cards?.find((c) => c.type === "pfz_ranking");
  if (pfz && "zones" in pfz && Array.isArray(pfz.zones) && pfz.zones.length > 0) {
    out.push({ key: "cards.pfz_ranking.zones", text: fill(T.zonesCount, { n: pfz.zones.length }) });
    const best = [...pfz.zones].sort((a, b) => a.rank - b.rank)[0];
    if (best && best.name && isFinite_(best.distance_km) && isFinite_(best.bearing_deg)) {
      out.push({
        key: "cards.pfz_ranking.zones[0]",
        text: fill(T.bestZone, { name: best.name, distance: spokenNumber(best.distance_km, 1), bearing: spokenNumber(best.bearing_deg, 0) }),
      });
    }
  }

  // 6. Route, only if the response contains one.
  const route = response.cards?.find((c) => c.type === "route_plan");
  if (route) {
    const r = route as Extract<Envelope["cards"][number], { type: "route_plan" }>;
    if (r.origin?.name && r.destination?.name && isFinite_(r.total_distance_km) && isFinite_(r.estimated_transit_hours)) {
      const band = BAND_WORD[lang][r.overall_route_risk] ?? r.overall_route_risk;
      out.push({
        key: "cards.route_plan",
        text: fill(T.route, {
          origin: r.origin.name, destination: r.destination.name,
          distance: spokenNumber(r.total_distance_km, 0), hours: spokenNumber(r.estimated_transit_hours, 1), band,
        }),
      });
      if (typeof r.crosses_protected_waters === "boolean") {
        out.push({ key: "cards.route_plan.crosses_protected_waters", text: r.crosses_protected_waters ? T.routeCrosses : T.routeClear });
      }
    }
  }

  // 7. Geofence warning, whenever one is present.
  for (const c of response.cards ?? []) {
    if (c.type !== "geofence_warning") continue;
    const g = c as Extract<Envelope["cards"][number], { type: "geofence_warning" }>;
    if (g.zone_name) out.push({ key: `cards.geofence_warning.${g.id}`, text: fill(T.geofence, { zone: g.zone_name, detail: g.detail ?? "" }).trim() });
  }

  // 8. How long the answer holds. Not a return time.
  const until = spokenTime(response.meta?.temporal?.end_time, lang);
  if (until) out.push({ key: "meta.temporal.end_time", text: fill(T.validUntil, { time: until }) });

  // 9. Degraded flag, in one sentence.
  if (response.meta?.degraded === true) out.push({ key: "meta.degraded", text: T.degraded });

  // 10. Offer more, and wait.
  out.push({ key: "offer", text: T.offer });

  return finish(lang, out);
}

function findEvidence(response: Envelope, re: RegExp): EvidenceRecord | undefined {
  return (response.evidence ?? []).find((e) => re.test(e.variable) || re.test(e.dataset));
}

function finish(lang: SpokenLang, sentences: SpokenSentence[]): SpokenScript {
  return { lang, sentences, text: sentences.map((s) => s.text).join(" ") };
}
