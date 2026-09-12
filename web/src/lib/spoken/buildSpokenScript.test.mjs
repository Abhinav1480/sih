#!/usr/bin/env node
/**
 * buildSpokenScript must say nothing about a field that is absent.
 *
 * Feeds the real captures, then the same captures with fields removed, and
 * asserts the fixed prefix of every template whose field is missing does not
 * appear in the script, in all four languages. Run by the honesty gate.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpokenScript, TEMPLATES } from "./buildSpokenScript.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const cap = (name) => JSON.parse(readFileSync(join(HERE, "..", "..", "captures", name), "utf8")).response;

const LANGS = ["en", "te", "ta", "hi"];
/** The longest literal run of a template (between placeholders); used to detect a sentence's presence. */
const prefix = (tpl) => tpl.split(/\{\w+\}/).map((s) => s.trim()).sort((a, b) => b.length - a.length)[0];
const has = (script, tpl) => {
  const p = prefix(tpl);
  assert.ok(p.length > 0, `template has no literal prefix: ${tpl}`);
  return script.text.includes(p);
};

let n = 0;
const ok = (name) => { n++; console.log("  ok  " + name); };

for (const lang of LANGS) {
  const T = TEMPLATES[lang];

  // A route answer speaks the route; a safety answer with no route card does not.
  const route = buildSpokenScript(cap("canonical-06-safest-route.json"), lang, "Lakshmi");
  assert.ok(has(route, T.route), `${lang}: route sentence present for a route answer`);
  assert.ok(route.sentences[0].key === "answer.verdict", `${lang}: verdict is spoken first`);
  const safe = buildSpokenScript(cap("canonical-02-safe-to-venture.json"), lang, "Lakshmi");
  assert.ok(!has(safe, T.route), `${lang}: no route sentence when there is no route card`);
  assert.ok(!has(safe, T.bestZone) && !has(safe, T.zonesCount), `${lang}: no zone sentence when there is no pfz card`);
  assert.ok(!has(safe, T.geofence), `${lang}: no geofence sentence when there is no warning`);
  assert.ok(has(safe, T.validUntil), `${lang}: validity spoken as valid-until`);

  // Zones are spoken only when ranked.
  const pfz = buildSpokenScript(cap("canonical-01-nearest-pfz.json"), lang, null);
  assert.ok(has(pfz, T.zonesCount) && has(pfz, T.bestZone), `${lang}: zones spoken for a pfz answer`);
  const noZones = structuredClone(cap("canonical-01-nearest-pfz.json"));
  noZones.cards.find((c) => c.type === "pfz_ranking").zones = [];
  assert.ok(!has(buildSpokenScript(noZones, lang, null), T.bestZone), `${lang}: empty zones list speaks no best zone`);

  // Remove fields one at a time; the matching sentence must vanish.
  const base = cap("canonical-02-safe-to-venture.json");

  const noRisk = structuredClone(base); noRisk.risk = null;
  const s1 = buildSpokenScript(noRisk, lang, null);
  assert.ok(!has(s1, T.score), `${lang}: no score sentence without a risk block`);
  for (const b of Object.values(T.band)) assert.ok(!s1.text.includes(b), `${lang}: no band sentence without a risk block`);

  const noWave = structuredClone(base); noWave.evidence = noWave.evidence.filter((e) => !/wave height/i.test(e.variable));
  assert.ok(!has(buildSpokenScript(noWave, lang, null), T.waves), `${lang}: no wave sentence without wave evidence`);

  const noWind = structuredClone(base); noWind.evidence = noWind.evidence.filter((e) => !/wind/i.test(e.variable));
  assert.ok(!has(buildSpokenScript(noWind, lang, null), T.wind), `${lang}: no wind sentence without wind evidence`);

  const badUnit = structuredClone(base); badUnit.evidence.find((e) => /wave height/i.test(e.variable)).unit = "furlongs";
  assert.ok(!has(buildSpokenScript(badUnit, lang, null), T.waves), `${lang}: an unknown unit is not spoken as metres`);

  const noAlerts = structuredClone(base); noAlerts.alerts = [];
  assert.ok(!has(buildSpokenScript(noAlerts, lang, null), T.advisory.replace("{severity} ", "")), `${lang}: no advisory without alerts`);
  assert.ok(!buildSpokenScript(noAlerts, lang, null).sentences.some((s) => s.key.startsWith("alerts.")), `${lang}: no advisory key without alerts`);

  const noEnd = structuredClone(base); noEnd.meta.temporal.end_time = "";
  assert.ok(!has(buildSpokenScript(noEnd, lang, null), T.validUntil), `${lang}: no validity sentence without end_time`);

  const notDegraded = structuredClone(base); notDegraded.meta.degraded = false;
  assert.ok(!buildSpokenScript(notDegraded, lang, null).text.includes(T.degraded), `${lang}: no degraded sentence when not degraded`);

  const noVerdict = structuredClone(base); noVerdict.answer.verdict = "SOMETHING_NEW";
  const s2 = buildSpokenScript(noVerdict, lang, null);
  for (const v of Object.values(T.verdict)) assert.ok(!s2.text.includes(v), `${lang}: an unknown verdict speaks no verdict`);

  // Nothing at all: only the offer.
  const empty = buildSpokenScript(null, lang, null);
  assert.equal(empty.sentences.length, 0, `${lang}: null response yields no sentences`);

  // Every sentence names the field it came from.
  for (const s of route.sentences) assert.ok(s.key && s.text, `${lang}: sentence carries key and text`);

  // Greeting: omits clauses whose values are missing.
  const g = buildSpokenScript(base, lang, "Lakshmi", { kind: "greeting", placeName: "Kakinada" });
  assert.ok(g.text.includes("Lakshmi") && g.text.includes("Kakinada") && has(g, T.waves), `${lang}: greeting carries name, place, waves`);
  const g2 = buildSpokenScript(null, lang, null, { kind: "greeting", placeName: null });
  assert.ok(!g2.text.includes("Kakinada") && !has(g2, T.waves) && g2.text.includes(T.greeting), `${lang}: greeting with nothing says only welcome and help`);

  ok(lang);
}

console.log(`buildSpokenScript.test: ${n} language(s) passed`);
