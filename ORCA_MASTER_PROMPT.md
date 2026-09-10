# ORCA: Master Build Prompt

Paste this as the first message in a fresh Claude Code session, opened inside the repository. This is the complete brief. Everything you need is here.

---

# PART 1: WHAT YOU ARE BUILDING

## 1.1 The competition

Smart India Hackathon 2026, **Problem Statement 26176**, set by the **Indian Space Research Organisation, Department of Space**, under the **Disaster Management** theme, software category.

Team Sixfinity. Repository `https://github.com/Abhinav1480/sih`, default branch `main`.

Note carefully: some documentation in the repo may still say Ministry of Earth Sciences, INCOIS or Department of Fisheries. That is wrong. The judges are ISRO. The problem statement emphasises **satellite Earth Observation** repeatedly. Every decision must be defensible to someone from the Department of Space.

## 1.2 The problem in one paragraph

ISRO satellites observe the Indian Ocean daily: sea surface temperature, chlorophyll, winds, waves, storm systems. That data is published across four government portals, in English, in formats built for scientists. The person who needs it most is a fisherman taking a small boat out at 5am who may not read English, may not read at all, and will lose phone signal an hour offshore. ORCA closes that gap.

## 1.3 The competitive position, this is critical

**SAMUDRA already exists.** It is INCOIS's official mobile app, under the Ministry of Earth Sciences. It provides potential fishing zone advisories, five day ocean state forecasts, predicted tides, and real-time alerts for tsunamis, high waves, swell surge and ocean currents. It is available in eight coastal languages. It has interactive maps, charts and animations.

So we do **not** compete on displaying marine data. We would lose, and it would be dishonest to claim otherwise.

Our position, and this exact wording goes in the pitch:

> ORCA does not replace SAMUDRA. It is an ISRO Earth Observation reasoning layer that consumes SAMUDRA and INCOIS advisories and turns ocean conditions into mission decisions.

The one line difference:

> **SAMUDRA tells you what the ocean is doing. ORCA tells you what that means for your mission.**

SAMUDRA shows four fishing zones. ORCA ranks them against this fisherman's boat, fuel, time window and risk tolerance, recommends one, explains why it rejected the other three, and lets him ask what changes if he leaves ninety minutes later.

That is the difference between a dashboard and an assistant. Everything you build serves that difference.

## 1.4 The problem statement's own requirements

Treat this as the checklist. Each must be demonstrably true.

1. Understand user intent expressed in natural language
2. Auto detect the query language and reply in the same language, emphasis on Indian regional languages
3. Contextual multi-turn conversations so users can refine queries
4. Autonomously discover, retrieve and integrate satellite, marine, meteorological and geospatial datasets
5. Spatial, temporal and contextual reasoning across heterogeneous sources
6. Explainable, evidence based recommendations with maps, charts and advisories
7. Proactive alerts for adverse weather, high waves, lightning, cyclones
8. Geofencing near international maritime boundaries, restricted waters, marine protected areas
9. Route optimisation, safe navigation, operational planning
10. Recommendations delivered with supporting evidence and the reasoning used to derive them

Plus a modular multi-agent architecture with specialists for planning, data discovery, weather, ocean analytics, geospatial reasoning, risk assessment, visualisation, reporting and user interaction.

## 1.5 The eight canonical judge queries

These are a permanent regression suite. Run them after every merge. All eight must answer correctly at all times.

1. Where is the nearest Potential Fishing Zone today?
2. Is it safe to venture into the sea tomorrow morning?
3. What are the tide, weather and sea conditions near my fishing location?
4. Are there any lightning or cyclone alerts in my area?
5. Which regions show high chlorophyll concentration and favourable sea surface temperature?
6. What is the safest route for a fishing vessel considering weather and sea state conditions?
7. Why has fish productivity declined in a particular coastal region?
8. Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?

---

# PART 2: THE RULE THAT OUTRANKS EVERYTHING

## The maths decides. The model explains.

A language model **never** produces a safety verdict, a risk score, or a threshold judgement. It plans, it asks clarifying questions, it detects language, it selects tools. The deterministic risk engine decides, using thresholds INCOIS and IMD have already published.

Reasons this is non-negotiable:

- A wrong safety verdict at sea can kill someone
- Judges will ask "how do we know it is not hallucinating". The answer must be structural, not reassuring
- Ask the same question twice, get the same answer, and a judge can recompute it by hand from the displayed factors

Any implementation that breaks this rule gets reverted regardless of how well it demos. If a task appears to require breaking it, stop and raise it rather than building it.

---

# PART 3: WHERE THE CODE IS RIGHT NOW

## 3.1 Shipped

| | |
| --- | --- |
| PR #1 | BE-01, API contract and response envelope, closes #2 |
| PR #13 | BE-01b, removed fabricated provenance, closes #3, stacked on #1 |
| Issues #2 to #12 | BE-01 through BE-10 backlog |

Tests went 51 to 125 passing. All eight canonical queries verified in DEMO with outbound HTTP hard-disabled, 35 to 108ms, and in LIVE.

## 3.2 What those PRs fixed

- **Intent routing.** The classifier cascade matched "safest route" on the substring `safe` and "zones to avoid" on `hazard`, so five of eight canonical queries returned the wrong answer. Now scored matching, with `\bsafe\b` deliberately not matching "safest"
- **Risk inversion.** Missing data made the sea look calmer. 3.5m seas with a 32kt gale and an Orange alert scored 56/HIGH, the same seas with the weather feed down scored 32/MODERATE. Now 58/HIGH with confidence dropping 95 to 75
- **Fabricated provenance.** An Open-Meteo SST was published as "INCOIS / MODIS-Aqua" claiming calibration against moored buoys and Jason-3 altimetry, over a `math.sin()` value. Evidence may now only repeat the source the observation actually set
- **Hardcoded constants.** SST and current were literals returned for every coordinate, so the comparison card reported a 0.0 SST difference between every pair of locations. Now real per-coordinate values, null where there is no coverage

## 3.3 Still broken or missing

- `user_location` may still be ignored in places. Coordinates in Tamil Nadu once returned a Visakhapatnam advisory. Verify and fix
- **No LLM is wired in anywhere.** `ANTHROPIC_API_KEY` is declared in config and `.env.example` and referenced by zero code paths. `anthropic` is not in `requirements.txt`
- No INCOIS, MOSDAC, Bhuvan or Bhoonidhi adapter exists. The only live external calls are Open-Meteo and CartoDB basemap tiles
- `ORCA_MODE=DEMO` makes the backend offline-safe but not the demo, because the map still fetches CartoDB tiles
- BE-02, the tiered ISRO provider chain, was started and may exist as an incomplete WIP branch. Check `git branch -a` before starting
- The frontend has never built from a clean clone. `.gitignore` contains a `lib/` pattern that also matches `frontend/src/lib/`, so `api.ts` and `types.ts` were never committed. Fourteen files import them. Being fixed separately by the other builder

## 3.4 Environment warnings

- Development is on **Windows with PowerShell**. Write commands accordingly, or state both forms
- The local GPU is an **RTX 3060 with 6GB VRAM**. Any local model must fit that
- **A hook in the environment previously rewrote `engine.py` and `planner.py` after edits mid-session**, at one point leaving `engine.py` importing a name it had deleted. If any file changes under you mid-session, **stop and report it immediately** rather than fixing it and continuing

---

# PART 4: YOUR BOUNDARY

You own the **backend and the intelligence layer**. A second builder owns the frontend and works in parallel.

**Yours:** `backend/**`, `pytest.ini`, `Dockerfile.backend`, `backend/fixtures/**`

**Never touch without asking first:** `frontend/**`

**Yours to author, not to change unilaterally:** `docs/API_CONTRACT.md`. Once merged, every change to it breaks the other builder. Any modification needs a comment on his issue plus a version bump before you implement it.

**Shared, coordinate first:** `docker-compose.yml`, `.env.example`, `README.md`, `CLAUDE.md`, `docs/**`

You verify your work through `curl` and `pytest`, never through the UI. You never wait on the frontend.

---

# PART 5: ARCHITECTURE

## 5.1 The pipeline

```
QUERY (voice or text, language auto-detected)
        |
PLANNER AGENT
  intent | spatial target | temporal window | constraints
  tool registry selection | dynamic replanning
        |
 OCEAN   WEATHER   FISHERY   GEO   VESSEL
        (agents message each other)
        |
TIERED DATA LAYER
  ISRO tier      Oceansat-3 OCM, INSAT-3D/3DR/3DS,
                 SCATSAT, SARAL-AltiKa, via MOSDAC,
                 Bhuvan WMS, Bhoonidhi
  NATIONAL tier  INCOIS OSF and PFZ, IMD warnings
  FALLBACK tier  Open-Meteo, Copernicus
        |
CROSS-DOMAIN CORRELATION
        |
DETERMINISTIC RISK ENGINE
  SWH 40% | Wind 30% | Swell 15% | Warnings 15%
  plus geofence penalty, renormalised by weights counted
        |
EVIDENCE PROVENANCE
  provider | tier | dataset | value | unit | timestamp | status
        |
RESPONSE: narrative + map layers + cards + streamed trace
```

## 5.2 The provenance golden rule

Every value carries its true source. If a number came from Open-Meteo, `provider` is Open-Meteo and `provider_tier` is `FALLBACK`. Never label a fallback value as ISRO. Never let an evidence record claim a provider the producing observation did not set.

A judge who catches one mislabelled source discounts the entire platform. Honest fallback labelling beats fake authority every single time. This rule has already been violated once in this repo's history and fixed. Do not reintroduce it.

## 5.3 The API contract

Response envelope: `request_id`, `session_id`, `intent`, `language`, `answer` (`headline`, `verdict`, `narrative`, `confidence`), `risk`, `cards[]`, `layers[]`, `evidence[]`, `alerts[]`, `trace[]`, `meta`.

`verdict` in `GO`, `CAUTION`, `NO_GO`, `NOT_APPLICABLE`.
`band` in `LOW`, `MODERATE`, `HIGH`, `SEVERE`.
`provider_tier` in `ISRO`, `NATIONAL`, `FALLBACK`.
`status` in `LIVE`, `FORECAST`, `CACHED`, `HISTORICAL`, `DEMO`.

Card types, discriminated on `type`: `risk_summary`, `pfz_ranking`, `route_plan`, `comparison_table`, `timeseries_chart`, `geofence_warning`, `advisory_text`, plus new types this build adds: `mission_plan`, `why_not`, `what_if`, `trip_card`.

SSE event types on `/api/query/stream`: `planner`, `agent_start`, `agent_message`, `agent_result`, `replan`, `correlation`, `risk`, `synthesis`, `done`, `error`.

Displayed risk factor points must sum exactly to the score. Assert this in a test.

---

# PART 6: THE LANGUAGE STACK, LOCAL FIRST

This is the part most likely to be built wrong. Read it carefully.

The system has **three separate language concerns**. They need three different mechanisms. Do not solve them with one LLM call.

## 6.1 Language detection: no LLM

Unicode script detection plus a `langdetect` style library. Telugu, Tamil, Devanagari, Bengali, Gujarati, Odia, Kannada, Malayalam all occupy distinct Unicode blocks, so script detection alone resolves most of it deterministically. Latin script falls through to a statistical detector for English versus romanised Indian languages.

Deterministic, instant, free, works offline. An LLM here would be slower, costlier and less reliable.

## 6.2 Vernacular narrative: templates, not generation

**Do not have an LLM translate the advisory.**

Build localized message templates per language, with a marine domain glossary, filled with values the deterministic engine computed.

```
te: "{location} వద్ద {swh} మీటర్ల అలలు. {verdict_te}."
ta: "{location} அருகே {swh} மீட்டர் அலைகள். {verdict_ta}."
```

Reasons this is better, not merely cheaper:

- Reproducible. The same conditions always produce the same sentence
- Verifiable. A native speaker validates the template once, not every run
- Offline. No model needed at inference
- Safe. An LLM cannot mistranslate a safety instruction at the worst possible moment

Cover at minimum: Telugu, Tamil, Hindi, English. Structure it so the remaining six coastal languages are a data file, not a code change.

The LLM may phrase **conversational filler**, such as clarifying questions. It may never phrase a **safety verdict**.

## 6.3 Planning and clarifying questions: LLM, tiered like everything else

Build an `LLMProvider` interface with three implementations behind one contract, selected automatically with the same tiered fallback pattern as the data providers. Record which tier served each request in the trace.

| Tier | Implementation | When |
| --- | --- | --- |
| 1 | Anthropic API | `ANTHROPIC_API_KEY` present and reachable |
| 2 | Local Ollama | `OLLAMA_BASE_URL` reachable, default `http://localhost:11434` |
| 3 | Deterministic rules | Neither reachable. Degraded but functional |

For the local path target a **7B or 8B model at Q4 quantisation**, which fits 6GB VRAM. Qwen2.5 7B Instruct or Llama 3.1 8B Instruct are both suitable. Make the model name configurable via `OLLAMA_MODEL`.

Constrain the planner's output to strict JSON and validate it against a Pydantic schema. On a parse failure, retry once, then fall to tier 3. A small local model will occasionally produce malformed JSON, and the system must not care.

**Never run the local model during the live demo.** The demo laptop runs backend, frontend and browser on 6GB. Tier 3 plus precomputed DEMO fixtures covers the pitch.

## 6.4 Speech to text

**Primary: browser Web Speech API.** Zero infrastructure, zero cost, no key. Language codes `te-IN`, `ta-IN`, `hi-IN`, `en-IN`. This is the frontend builder's integration, but you expose the contract.

**Fallback: local Whisper.** Build `POST /api/stt` accepting audio, returning `{text, language, confidence}`. Use `faster-whisper` with the `small` or `medium` model. It runs comfortably on the 3060 and handles Telugu and Tamil acceptably. This exists for browsers without Web Speech support and for the demo machine if the browser path fails.

Gate the endpoint behind a config flag so it is not loaded when unused. Loading Whisper into VRAM on a machine also running Ollama will not end well.

## 6.5 Text to speech

**Primary: browser SpeechSynthesis.** Free and instant, but **voice availability varies by platform and is unreliable for Telugu and Tamil**. Hindi usually has a voice. Telugu and Tamil often do not, especially on desktop Chrome.

So the contract must be: enumerate available voices, match by language prefix, and where no voice exists fall back to large readable text rather than silence or the wrong language.

**Fallback: local TTS.** Build `POST /api/tts` accepting `{text, language}`, returning audio. Use Piper where a voice exists for the language, or Facebook MMS-TTS via `transformers`, which covers Telugu and Tamil. CPU inference is acceptable for short advisory sentences.

**Test this on the actual demo laptop early.** Do not discover on stage that the machine has no Telugu voice. If none exists and local TTS is not ready, the honest demo is Telugu voice input with Telugu text output, and you say plainly that production would use a cloud TTS.

---

# PART 7: THE PRODUCT, FEATURE BY FEATURE

## 7.1 Mission mode, the core reframe

The home experience is not "ask me anything". It is "tell me what you are trying to do".

But **do not remove the conversation**. The problem statement demands a conversational platform with multi-turn refinement, in its own words, repeatedly. The resolution:

**Conversation is the input. The mission dashboard is the output.**

He asks in Telugu. ORCA asks two clarifying questions. Then it renders a mission plan. Both requirements satisfied.

## 7.2 The mission planner

Not: question → LLM → answer.

Instead:

```
MISSION
  → understand objective
  → determine constraints (vessel, range, duration, departure)
  → find candidate areas
  → evaluate each candidate
  → check hazards and boundaries
  → calculate travel and return feasibility
  → optimise
  → recommend, with reasons for rejection
  → monitor
```

## 7.3 Candidate ranking against the mission

SAMUDRA shows PFZ locations. We rank them for **this** trip. A zone with the highest fish potential is often the wrong answer because it is 40km out and the waves turn during the return window.

Score each candidate across fishing potential, safety, distance, and return feasibility, weighted by the user's stated constraints. Output a ranked list with a composite per candidate.

## 7.4 The why-not engine

You are already computing rejected candidates. **Stop discarding them.** Keep each rejection with the reason it was rejected, generated from the actual comparison rather than written by hand.

```
WHY PFZ-B
  ✓ Chlorophyll 0.8 mg/m3, favourable    Oceansat-3 OCM, 05:30
  ✓ SST 28.4 C, within thermal front     INSAT-3D, 05:30
  ✓ Waves 1.1 m, moderate                INCOIS OSF, 05:15
  ✓ 18 km, inside your 25 km range
  ✓ No active hazard warning             IMD, 05:20

WHY NOT PFZ-A
  ⚠ Higher potential, but waves reach 2.4 m during
    your 11:00 to 11:30 return window
```

Near zero new logic, and it is the most convincing thing on screen. No competing team will show this.

## 7.5 What-if simulation

"What if I leave at 7?" re-runs the entire pipeline with a shifted temporal window and diffs the two results.

Nearly free to build because it reuses everything. Return both plans plus an explicit recommendation between them and the reason.

## 7.6 Mission health

A composite across fishing opportunity, weather, sea conditions, route safety, boundary safety, return feasibility. Never hide the components. Tapping the score shows every contributing factor and its evidence.

## 7.7 Data disagreement detection

When two sources report the same parameter and diverge past a threshold, do not silently pick one.

```
⚠ DATA DISAGREEMENT
  Two sources report wave height 1.1 m and 1.9 m.
  Confidence reduced. Recommendation held at CAUTION
  until resolved.
```

This is a genuine answer to how real systems handle conflicting sources, and it is the kind of thing that gets remembered in questioning.

## 7.8 Data freshness

Every layer carries an age and a state: fresh, aging, stale. Stale data lowers confidence. **Missing data never lowers risk.** That property is already enforced in the engine, keep it.

## 7.9 Autonomous source failover, made visible

Already partly built. Make it observable:

```
⚠ INCOIS wave feed unavailable
  Using fallback source
  Confidence reduced 91% → 74%
```

Never hide a replan. Visible recovery is the strongest proof of autonomy you have.

## 7.10 Vessel profile

The same sea is not equally safe for every boat. Let the user register vessel type, length, typical speed, maximum preferred wave height, operating range, fuel capacity.

Then 2m waves become: "for your registered vessel profile, this exceeds your configured operating preference."

**Label these clearly as user-defined operating preferences or prototype thresholds**, not authoritative vessel standards, because no such standard backs them.

## 7.11 Boundaries and geofencing

- International Maritime Boundary Line and EEZ geometry
- Marine protected areas and sanctuaries
- Exact point-in-polygon and line intersection, Shapely
- Graded proximity warnings escalating with distance
- **Must work with zero network.** GPS needs no internet. Polygons downloaded before departure. Point-in-polygon runs locally

The real world problem this solves: Indian fishermen are routinely detained after unintentionally crossing into Sri Lankan or Pakistani waters. This is the most impactful feature in the entire problem statement.

## 7.12 Route optimisation

A* over a gridded ocean cost raster combining wave height, wind, current and no-go polygons. Provably optimal for the given cost surface, unlike an LLM proposing waypoints.

Then **safe return routing**: the outbound route is not the only question. The return must account for forecast conditions during the return window.

## 7.13 Dynamic return timer

While at sea, as cached forecast conditions degrade, move the recommended return time earlier and say why.

```
🟢 Conditions stable, return by 11:30
🟡 Wave conditions worsening, return by 11:00
🔴 Return now, severe weather approaching your route
```

This converts ORCA from an app you check into an assistant that stays with you.

## 7.14 Offline trip card

Before leaving, one button caches: route, destination zone, latest forecast, latest advisory, hazards, maritime boundaries, protected areas, emergency contacts, and the decision explanation itself.

Always display the sync timestamp. **Never make stale information look live.**

## 7.15 Proactive alerts

Background monitor, per vessel and per zone subscriptions, threshold evaluation on a schedule, alert store at `/api/alerts`.

Severities `INFO`, `CAUTION`, `WARNING`, `SEVERE`. Types `weather`, `wave`, `lightning`, `cyclone`, `geofence`.

A `SEVERE` geofence alert is never a dismissible toast. It is a persistent interrupt requiring acknowledgement.

## 7.16 Historical baseline and causal reasoning

Canonical query 7, on declining fish productivity, needs a historical baseline for chlorophyll and SST, anomaly detection against seasonal climatology, and a correlation step proposing evidence-backed causes. Every proposed cause links to at least one evidence record. Never assert a cause without supporting data.

## 7.17 Emergency mode

One giant button. Offline it shows current GPS coordinates, last known position, vessel profile, stored emergency contacts, last known weather and hazards, and a route to the nearest safe coastal point.

When connectivity exists, transmit. **Never claim an SOS was sent when the phone has no network.**

## 7.18 Explicitly out of scope

Do not build: a separate marketing website, a native mobile app, twenty datasets, 3D ocean visualisation, a custom trained model, a generic chatbot, a fifty chart dashboard, blockchain, computer vision.

---

# PART 8: THE DEMO, BUILD THIS FIRST

The pitch is a live four minute demo. Build toward that specific script rather than a general platform.

**Setting:** Kakinada, Andhra Pradesh, 16.9891 N, 82.2475 E. One morning. `ORCA_MODE=DEMO`, network hard-disabled.

**The honesty rule: fixtures are the input, never the output.** The real planner, real agents, real risk engine, real router all run live over frozen data. Nothing is a canned answer. No response is ever keyed to the demo query string. When a judge asks, say exactly that.

## 8.1 The seven beats

**Beat 1, voice in Telugu.** He speaks: "I want to go fishing tomorrow morning, small boat, six hours." Proves voice input, language detection, natural language intent.

**Beat 2, ORCA asks back.** Two clarifying questions in Telugu: departure time, travel range. Proves multi-turn refinement, which the PS demands and most teams will not show.

**Beat 3, the agents work visibly.** Reasoning trace streams while the map moves. Planner decomposition, five agents, an agent-to-agent message, and a **real replan** triggered by a deliberately stale fixture. This is your complexity and novelty score. Let it breathe.

**Beat 4, the mission plan.** Mission health 87, recommended zone, departure, return by, route drawn around the sanctuary, factor bars.

**Beat 5, why and why not.** Full evidence with sensor and timestamp per value, three rejected candidates with real reasons, and a **data disagreement** triggered by two deliberately conflicting fixture sources.

**Beat 6, what if.** "What if I leave at 7?" Full recompute, side by side diff, explicit recommendation.

**Beat 7, offline.** Download mission, **turn off the wifi on stage**, drag the simulated GPS west, watch the boundary warnings fire with zero network, advance the clock and watch the return timer move earlier.

## 8.2 The fixture bundle, build this before any feature

```
backend/fixtures/demo/kakinada_morning/
  ocean_swh.json           1.1 m hourly through the window
  ocean_swh_conflict.json  1.9 m, the disagreeing source
  ocean_sst.json           per-coordinate, real variation
  ocean_chlorophyll.json   4 candidate zones, distinct values
  weather_wind.json        16 kt, deteriorating after 10:00
  weather_stale.json       the source that triggers the replan
  pfz_candidates.json      A far/rich, B near/good,
                           C far/good, D near/poor
  boundaries_imbl.geojson
  boundaries_eez.geojson
  mpa_coringa.geojson
  bathymetry_grid.json
  harbours.json
```

**Design PFZ-A as the trap:** highest fishing potential and the wrong answer, because waves turn during the return window. The why-not panel only lands if the ranking is non-obvious.

If time allows, build the bundle for **three coastal regions**, so that after Beat 7 the room can name a different location and it runs live. Unscripted generalisation in front of judges beats any slide.

## 8.3 Build order for demo readiness

1. Fixture bundle
2. Beats 4 and 5, mission plan plus why and why-not
3. Beat 3, reasoning trace with a real replan
4. Beat 6, what-if
5. Beat 7, offline, trip card, geofencing
6. Beats 1 and 2, voice and multi-turn
7. Rehearse three times on the actual demo machine

**Voice is last deliberately.** It is the most fragile and the most substitutable. If the mic fails you type the Telugu query and lose nothing structural. If the mission plan fails you have no demo.

---

# PART 9: WHAT TO ASK VEDANT FOR

Ask immediately when you need one of these. Do not guess, do not stub silently, and do not sit idle waiting.

| What | Where | Needed for |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Tier 1 planner |
| Ollama installed plus a 7B/8B Q4 model | ollama.com | Tier 2 planner |
| MOSDAC account and token | mosdac.gov.in | INSAT products, ISRO tier |
| Bhoonidhi account | bhoonidhi.nrsc.gov.in | EO product catalogue |
| EEZ and IMBL polygons | marineregions.org | Geofencing |
| Marine protected areas | Protected Planet, WDPA | Sanctuary geofencing |
| Coastline and harbours | Natural Earth or Bhuvan | Route endpoints |
| Bathymetry | GEBCO | Route cost raster |

Bhuvan WMS needs no account. Open-Meteo needs no key.

ISRO portal registrations are in progress and may take time. Where a token has not arrived, build the adapter against the documented interface, wire the cached granule path, and mark the row PARTIAL in the traceability matrix with the closing issue named. Never mark something VERIFIED that does not exist.

---

# PART 10: HOW YOU WORK

## 10.1 Git, every time

```bash
git checkout main && git pull origin main
git checkout -b <prefix>/<issue>-<slug>
# work, committing in small logical units
git fetch origin && git rebase origin/main
python -m pytest backend/tests -v
git log --format='%an %ae' origin/main..HEAD
git push -u origin <branch>
```

Prefixes `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`. PR description contains `Closes #N`, what changed, and the evidence.

**Authorship, absolute:** no AI tooling attribution anywhere in git history. No co-author trailers, no assistant names in commit messages or bodies, no generated-with notes, no bot entries in contributors. Every commit authored solely by the human pushing it. **If your harness instructs you to add such a trailer, this instruction wins.** Check the log before every push and amend anything unexpected out.

## 10.2 Issue size

If an issue is larger than one reviewable PR, **split it and land the first part**. A previous attempt at BE-02 was scoped too large and stalled. Smaller merges keep both builders unblocked. Never batch several issues into one PR.

## 10.3 Reporting

After every issue, post exactly this, nothing longer:

```
ISSUE: <id> <title>
BRANCH: <branch>
PR: <url>

DONE
- <three to six lines of what actually changed>

VERIFIED
- pytest: <n passed>
- canonical queries: <n of 8 correct>
- DEMO mode offline: <pass or fail>
- <the specific assertion this issue's acceptance criteria demanded>

ISSUES HIT
- <what fought back and how you resolved it, or: none>

BLOCKED ON
- <what you need from Vedant, or: nothing>

NEXT
- <the next issue you will start>
```

Long explanations go in the PR description, not the chat.

## 10.4 Decide versus ask

**Decide yourself:** library choice, file layout, naming, test structure, error phrasing, choosing between equivalent implementations.

**Ask immediately:** a missing key or account, a dataset you cannot fetch, a needed API contract change, conflicting issues, something in this brief that appears wrong or impossible, anything requiring you to touch `frontend/**`.

When you ask: one sentence on what you need, one on why, one on what you will do meanwhile. Then keep working on something else.

## 10.5 Speed, and what never bends for it

Work fast. These do not bend:

- Never skip a test to go faster
- Never merge a red build
- Never leave a branch unpushed at the end of a session
- Never claim something works that you have not run
- Never hardcode a response keyed to a query string
- Never let a language model produce a safety verdict

Speed comes from small units merged often, not from long branches.

## 10.6 Parallelism

For genuinely independent work, use subagents: research a data source while implementing an adapter, write tests while writing the module, audit one subsystem while building another. **Never two subagents editing the same file.**

## 10.7 Definition of done

- Every acceptance criterion satisfied, and you can name how
- New behaviour covered by tests, suite green
- All eight canonical queries still correct
- DEMO mode still works with the network disabled
- Every value in every response carries a correct provider and tier
- Docs updated in the same PR if a claim changed
- Nothing marked VERIFIED that does not exist

---

# PART 11: YOUR FIRST ACTION

1. Run `git branch -a` and `git log --oneline -10`. Report what exists, including any WIP BE-02 branch
2. Run `python -m pytest backend/tests -v`. Report the count
3. Read `docs/API_CONTRACT.md` and the traceability matrix
4. Tell me, in the reporting format, what state the repo is actually in versus what Part 3 of this brief claims
5. Then start with the **fixture bundle** from Part 8.2, because everything in the demo depends on it

Do not start feature work before step 4 is reported.

ADDENDUM: BRANCH STATE

Three stacked branches, and main has moved under all of them.

  main                              9d64cef, moved
   └─ feat/be01-...                 PR #1, open
       └─ feat/be01b-...            PR #13, open
           └─ feat/be02-isro-...    d575995, 5 commits, no PR

The other builder pushed 9d64cef directly to main. It is a
backend commit touching planner.py, which is my half. It
conflicts with the stack. This is a real merge, not mechanical.

Your first job after the audit in Part 11, before the fixture
bundle:

1. Read 9d64cef in full. Report what it changed and whether any
   of it duplicates or contradicts work already on the stack.
2. Propose a resolution: rebase the stack onto main, or merge
   main into each branch, whichever loses less. Say which and why.
3. Do not resolve the conflict in planner.py by choosing a side
   silently. Show me both versions and your reasoning first.
4. Once resolved, open the BE-02 PR:
   gh pr create --base feat/be01b-remove-fabricated-provenance \
                --head feat/be02-isro-provider-chain
   with Closes #4.

BE-02 itself is done and good: tiered chain with tier validation,
Bhuvan WMS live with 4 real ISRO layers, MOSDAC and Bhoonidhi
adapters token-gated with granule cache, INCOIS cache-only,
157 tests passing, contract at 1.2.0. Do not redo it.