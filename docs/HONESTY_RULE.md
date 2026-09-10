# The honesty rule

> **No user-visible value may originate from a `||` default or an equivalent
> fallback, and no agency name may appear beside a value that agency did not
> produce.**

This is enforced mechanically. It is not a review convention and it is not
something anyone has to remember.

---

## 1. Why it exists

Phase 0 removed a set of fabrications from ORCA. They were not sloppy code;
each one was a small, reasonable-looking convenience that changed what the
product told a person about the sea:

| What the code said | What the user saw |
| --- | --- |
| `(alert_level \|\| "Green")` under an `IMD` heading | a green all-clear from a national agency ORCA never contacted |
| `properties.chlorophyll \|\| "1.2"` | a measurement, indistinguishable from a real one |
| `properties.authority \|\| "Wildlife Protection Act 1972"` | an invented statutory citation |
| `scoreMap[band] ?? 30` into an ARIA meter | a screen reader told the engine had scored the route |
| `hourly.get("wave_height", [1.5])[idx] or 1.5` | 1.5 m seas and a benign verdict, stamped LIVE and attributed to Copernicus |
| `Math.round(Number(score) \|\| 0)` | "score 0 out of 100" — the safest possible reading of a number nobody computed |

Every one is the same shape: **a missing value rendered as an affirmative
statement.** The person most affected is a fisherman deciding whether to take a
small boat out at 5am, who has no way to tell a measurement from a default.

The gates below exist because the last one on that list survived Phase 0. P0-7
correctly taught `RouteAnalysisCard` to pass `null` instead of a made-up score
— and `RiskGauge`, one component downstream, turned that `null` straight back
into `0`. A hand-audit found the first defect and missed the second. A gate
finds both, every build, forever.

---

## 2. What the rule means in practice

**A value ORCA did not measure must say so.** Fall back to an explicit absence
marker — `"unavailable"`, `—`, `""`, `null` — never to a plausible number or a
reassuring phrase. Absence markers are allowed by the gate on purpose: falling
back to one *is* the fix.

**The browser never decides safe versus unsafe.** It does not band a value, map
a measurement to a colour or a verdict, or compute a score. `calculate_marine_risk`
in `backend/app/risk/engine.py` is the only formula. Two formulas mean two
answers to the same question inside one response — which shipped once already.

**An agency name arrives from the response or not at all.** Reading a provenance
value the backend sent (`tier === "ISRO"`, a `ProviderTier` union) is fine —
that is displaying provenance. Writing the name in yourself is not.

### The display-label exception

A pure display label may have a default: `layer.legend_title || "Untitled"` is
fine. The exception is narrow and is encoded in one place — the `VALUE_WORDS`
list in `frontend/scripts/honesty-rules.mjs`, which deliberately omits `label`,
`title`, `name`, `text` and `color`. If a field name contains none of the value
words, it is treated as a label. **Widening that list is how you tighten the
rule; adding a word to it is cheap and is the preferred fix.**

---

## 3. The checks

### Frontend — `frontend/scripts/check-honesty.mjs`

Static analysis over `frontend/src`. Comments are blanked before scanning, and
for the structural rules string *bodies* are blanked too, so a comment
mentioning `||` or a sentence containing the word INCOIS cannot trip anything.
Line numbers are preserved exactly, so a failure names a real line.

| Rule | Catches |
| --- | --- |
| `default-supplies-a-value` | `\|\|` / `??` / presence-ternary defaults supplying a measurement, threshold, verdict, score, provenance field, timestamp or unit. Sees through `Number(...)`, `parseFloat(...)`, `Math.round(...)`. Numeric defaults always fail; string defaults fail unless they are absence markers |
| `client-side-threshold` | a measurement compared against a numeric literal in the browser. Comparing two backend values is fine; so are counts, indexes and lengths |
| `hardcoded-agency` | `INCOIS`, `IMD`, `ISRO`, `MoEFCC`, `Copernicus`, `NRSC`, `MOSDAC`, `Bhoonidhi` written into the UI. Comparisons and type unions are exempt — they read provenance rather than assert it |
| `mock-import` | anything under `src/mocks/`, any import reaching it, any known mock symbol, and the directory existing at all |
| `hardcoded-legal-text` | statutory citations — `... Act 1972`, `CRZ Notification`, `Section 12 of`, `Schedule I`, `Gazette of India` |
| `cached-shows-question` | a structural check: `StaleWarning` must accept AND render `queryText`, every call site must pass it, and the `offline.cached.forQuestion` label must exist in every language that has the banner. Was `check-cached-shows-question.mjs` (P0-8), folded in here |
| `P0-5`, `P0-7`, `P0-8` | the exact literal defects Phase 0 removed, kept named so a reintroduction fails with its history attached rather than as an anonymous pattern hit |

### Backend — `backend/tests/test_honesty_rule.py` (`pytest -m honesty`)

| Check | Catches |
| --- | --- |
| `test_no_provider_substitutes_a_constant_for_a_measurement` | an AST scan of **every** file in `app/providers/` for `.get("wave_height", [1.5])` and `wave_height or 1.5`. P0-6 scanned one file; this scans all of them |
| `test_evidence_provider_matches_the_tier_its_source_earns` | an evidence record claiming a tier its own provider string does not earn under `classify_tier` — an unearned promotion |
| `test_no_demo_value_is_labelled_live` | a synthetic value published with a `LIVE` freshness stamp |
| `test_only_the_engine_computes_a_risk_score` | a second scoring formula anywhere outside `app/risk/engine.py` |
| `test_the_engine_is_the_only_thing_that_bands_a_score` | a second set of band cut points outside the engine |

`app/risk/pfz.py::score_zone` scores fishing **suitability**, not marine risk,
and is deliberately out of scope for the one-formula rule.

Related, and load-bearing on the allowlist:
`backend/tests/test_frontend_boundaries_match.py` pins the MPA polygons and
authority strings bundled in `frontend/src/lib/geofence/boundaries.ts` to
`backend/app/geospatial/protected_areas.py`. That copy had already drifted —
it kept the four oversized rings P0-3 scaled down, so the browser flagged
fishermen sitting in their own home ports.

---

## 4. Running them

```bash
# Frontend. Also runs automatically as `prebuild`, so `npm run build` fails.
cd frontend
npm run check:honesty            # the gate
npm run check:honesty:report     # list findings without failing
npm run check:honesty:proof      # prove every check still fails on its violation

# Backend.
pytest -m honesty                # the checks
pytest -m honesty_proof          # the proofs
```

All four run in CI on every push and pull request (`.github/workflows/ci.yml`).

---

## 5. Proof tests

**A gate nobody has seen fail is not a gate.**

`frontend/scripts/honesty.proof.mjs` and
`backend/tests/test_honesty_rule_proofs.py` each reintroduce a real violation
into the real tree, run the real gate as a subprocess, assert it fails *and
names the right rule*, then remove the violation and assert it passes again.
Nothing is stubbed. If the scanner stops walking `src/`, if a regex stops
matching, if someone allowlists a whole directory, the proofs fail.

Every check listed in section 3 has one. **A new check without a proof test is
not finished.**

---

## 6. Requesting an allowlist entry

Exceptions live in `frontend/scripts/honesty-allowlist.mjs`. There are four.
Keep it that way.

An entry needs a `rule`, a `file` (or `dir`), ideally a `contains` to narrow it
to specific lines, and a `why` — **one line saying why the match is not a
fabrication.** "It is inconvenient" is not a justification. If you cannot write
the line, the code is the problem, not the rule.

Prefer, in order:

1. **Fix the code.** Most findings are real. `EvidencePanel` rendered the literal
   `ISRO` after checking `t === "ISRO"`; rendering `{t}` instead removed the
   finding and made the badge provably show what actually arrived.
2. **Sharpen the rule.** If the pattern is systematically wrong — structural
   counts, comparisons that read rather than assert — encode that in
   `honesty-rules.mjs` so it holds everywhere, not just at one site.
3. **Then allowlist**, narrowly, with `contains`.

### The current four

| Entry | Justification |
| --- | --- |
| `lib/backend/fallbackResponse.ts` — agency | a DEMO envelope captured verbatim from the backend; the agency names in it are the backend's own provenance strings. `api.ts` stamps it cached and `StaleWarning` says so on screen, so it cannot pass as live. Rewriting the capture would stop it being a capture |
| `lib/geofence/boundaries.ts` — agency, `authority:` | copied from `protected_areas.py` and **pinned to it** by `test_frontend_boundaries_match.py` |
| `lib/i18n/offline.ts` — agency, `offline.contact.incois` | an emergency-contact label beside a published helpline number; it attributes no measurement to anyone |
| `components/Evidence/evidenceUtils.ts` — threshold, `bestScore` | an internal relevance cut-off for matching evidence to a card; computed by the browser from the browser's own matching, and never rendered |

Two of those justifications are only true while a test passes. If
`test_frontend_boundaries_match.py` starts failing, the second entry is a lie
and must be removed along with the drift.
