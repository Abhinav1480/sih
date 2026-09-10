import type { LangDicts } from "./index";

/**
 * i18n strings owned by the offline track: the connectivity banner, the
 * relative-age formatter in lib/offline/store.ts, and the trip card.
 *
 * Reconstructed after the module was lost from the working tree -- every key
 * here is one that src/ already calls t() with; the file is the dictionary
 * those call sites were always written against, not new copy.
 *
 * `en` only, deliberately. This module's contract (see ./index.ts) is that `en`
 * is the authoritative base and a key missing for a language falls back to it.
 * Inventing Telugu or Tamil for safety-adjacent strings -- an emergency contact
 * label, a staleness warning -- would be exactly the kind of fabrication the
 * honesty rule forbids. Verified translations drop in as `te: {...}` etc.
 * without touching a component.
 */
export const offline: LangDicts = {
  en: {
    // Connectivity banner
    "offline.online": "Online",
    "offline.offline": "Offline",
    // {age} is substituted with the output of formatAge() by the banner, which
    // splits on the placeholder rather than interpolating.
    "offline.synced": "last synced {age}",
    "offline.neverSynced": "never synced",
    "offline.stale": "STALE",

    // Relative age, formatAge() in lib/offline/store.ts
    "offline.age.justNow": "just now",
    "offline.age.min": "{m} min ago",
    "offline.age.hm": "{h} h {m} min ago",
    "offline.age.dh": "{d} d {h} h ago",

    // Cached-result warning (components/Offline/StaleWarning.tsx). The age is
    // appended by the component; these strings never restate the verdict.
    "offline.cached.notLive": "Saved answer, not live. Saved",
    "offline.cached.recheck": "Conditions may have changed — reconnect and ask again before sailing.",

    // Trip card
    "offline.trip.title": "Trip card",
    "offline.trip.close": "Close",
    "offline.trip.destination": "Destination",
    "offline.trip.when": "When",
    "offline.trip.verdict": "Decision",
    "offline.trip.noVerdict": "No decision saved",
    "offline.trip.conditions": "Conditions",
    "offline.trip.boundaries": "Boundaries",
    "offline.trip.noBoundaries": "No boundaries saved",
    "offline.trip.contacts": "Emergency contacts",
    "offline.trip.why": "Why",
    "offline.trip.noFactors": "No factors saved",
    "offline.trip.score": "Score",
    "offline.trip.sum": "Total",
    "offline.trip.source": "Source",
    "offline.trip.sourceUnavailable": "not recorded",
    "offline.trip.degraded": "Saved while some data was unavailable. Check conditions before sailing.",
    "offline.trip.savedAt": "Saved",
    "offline.trip.save": "Save trip card",
    "offline.trip.saved": "Saved",
    "offline.tripCard.open": "Trip card",

    // Emergency contact labels. The numbers live in lib/offline/tripCard.ts and
    // are rendered verbatim; a contact with no public number shows seeBoard
    // rather than a plausible-looking one.
    "offline.contact.icg": "Indian Coast Guard",
    "offline.contact.fishermen": "Fishermen distress helpline",
    "offline.contact.port": "Local harbour authority",
    "offline.contact.incois": "INCOIS",
    "offline.contact.seeBoard": "see harbour board",
  },
};
