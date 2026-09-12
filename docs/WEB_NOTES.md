# Web notes

Append-only log from the web track (`web/`). Newest entry at the bottom.

---

## 2026-09-12 · First full build on `feat/web-app`

**What exists.** An independent Next.js 16 project under `web/`, built only
against the contract 1.5.0 captures in `docs/examples/` (copied verbatim into
`web/src/captures/`; the build fails if the copies drift). Pages: landing,
sign in, sign up, forgot, onboarding, dashboard, ORCA AI, map, alerts, trips,
profile, about the data, 404 and error. Four languages in their own scripts
and numerals. Both themes. Voice in and out through the Web Speech API.

**Decisions worth knowing.**

- *Branch and worktree.* `feat/web-app` lives in a separate git worktree at
  `C:\CODING\ASIH-176-web` so the Android session on `main` and this one never
  share a working copy. Only `web/` and this file are touched. Not merged.
- *Capture routing is visible.* In capture mode a question is routed to one of
  the eight canonical captures by keywords. The UI always prints the question
  the recording actually answered beside the answer, plus the capture date
  and the envelope's own DEMO and degraded flags, so a mismatch is disclosed
  rather than hidden. Set `NEXT_PUBLIC_ORCA_API_BASE` to go live; the client
  and every component are unchanged.
- *The spoken script is one function.* `web/src/lib/spoken/buildSpokenScript.ts`
  is the only producer of spoken text and reads only the response. Verdict
  first, then band and score, then wave and wind from their own evidence
  records with the observation time and whether the value was observed,
  forecast or synthetic, then advisories attributed to their `source`, zones
  only if `pfz_ranking.zones` is non-empty, a route only if `route_plan`
  exists, geofence warnings, `meta.temporal.end_time` spoken as "valid until"
  and never as a return time, the degraded flag, and an offer of more. An
  unknown verdict, band or unit produces no sentence. The test feeds the real
  captures with fields removed and asserts silence, in all four languages.
- *Numbers in speech are Latin digits; numbers on screen are the reader's.*
  Speech engines read "1.8" reliably and Telugu numerals unreliably, so the
  engine gets Latin digits and the transcript transliterates them.
- *The greeting is a real fetch.* Opening ORCA AI or the dashboard runs the
  conditions query for the saved home harbour (the recorded conditions
  capture in capture mode) and builds the greeting from that envelope with
  `kind: "greeting"`. A missing home harbour, wave record or verdict simply
  drops that clause.
- *Auth.* The browser talks only to same-origin `/api/auth/[action]` route
  handlers, which keep the access and refresh tokens in httpOnly cookies and
  refresh transparently. With `ORCA_API_BASE` set they proxy the backend's
  contract 1.5.0 endpoints; without it a local stand-in with the same
  request, response and error shapes answers, persisting users under
  `web/.orca-local/` (gitignored), and the sign-in pages say on screen that
  it is a stand-in. Switching is one environment variable and no code.
- *Trips and conversations are browser-local.* Contract 1.5.0 has no trips or
  conversation-list endpoint for the web to use with a token, so both live in
  localStorage and the pages say so. Every trip field is copied from the
  envelope it was saved from; nothing is recomputed.
- *Map.* Esri World Ocean Base is the basemap (CARTO now requires an API key);
  the dark theme inverts the tile pane with a CSS filter rather than loading a
  second product. The map fits the answer's own points and lines; the six MPA
  polygons are context and never drive the fit. WMS layers render straight
  from the URL and params in the response, attribution shown whenever on.
  Zone markers are sized by rank and coloured by the `advisory_status` string
  as sent; route segments by `segment_risk`.
- *Honesty gate.* Ported from `frontend/scripts/` and extended: a
  `hardcoded-english` rule (JSX text and user-visible attributes must come
  from the locale files), a `spoken-script` structural check (one
  `buildSpokenScript`, its test passing, exactly one
  `SpeechSynthesisUtterance` site), `locale-complete`, `unknown-card` and
  `captures-drift`. The default-supplies-a-value rules scan the string-intact
  view, because on the string-blanked view a string default reads as an
  absence marker and `e.provider || "Open-Meteo"` slipped through. Seventeen
  proofs, each watched to fail and pass again. Allowlist is empty.
- *Hook hygiene.* The Next 16 lint config enforces the React Compiler rules.
  Storage-backed state goes through `useSyncExternalStore` (`useStoredJSON`,
  `useNow` in `web/src/lib/storage.ts`) and the theme reads the root
  `data-theme` attribute through a MutationObserver, so no component sets
  state inside an effect.

**Verified in Chrome (Playwright, 1440 and 1024 wide, both themes, English
and Telugu).** Every page renders with no page errors and no 5xx. A three-turn
typed conversation works and the second turn sends the first turn's
`session_id` as `conversation_id`. The voice button shows the plain-language
explanation before the browser prompt, enters the listening state with a
level meter on allow, and Escape aborts it. Chrome's en-IN voice speaks the
English script; Telugu, Tamil and Hindi show the honest "no voice installed"
note in this Chrome because it ships no voices for them, and never speak
English instead. Ctrl+K opens the palette and Escape closes it; Escape closes
the account menu. `prefers-reduced-motion` stops the ocean. Sign up, onboarding,
Telugu greeting by name, save trip, trips detail, profile persistence, sign
out, wrong-password error and sign-in all pass against the stand-in; tokens
are httpOnly cookies and nothing token-like is in localStorage.

**Not verified.** Spoken output in Telugu, Tamil and Hindi on a machine that
has those voices installed. Live speech recognition against Google's service
from a real microphone. The live backend transport (no backend is run to
develop, by rule). Frame cost of the background on a mid-range laptop; the
animation is three blurred transforms and one translate, which composite
without repaint, but it has not been profiled on slower hardware.

**Known gaps.** `comparison_table` and `geofence_warning` cards have no
capture, so they are built from the Pydantic schema only. The forecast time
scrubber only has points when the answer carries a `timeseries_chart` card
(canonical query 7, one point); otherwise it states the answer's window.
Password reset does not exist in the contract; the page says so. The
about-the-data page renders `docs/DATA_SOURCES.md` in English inside
localised chrome, and says it is the project's own English register.
