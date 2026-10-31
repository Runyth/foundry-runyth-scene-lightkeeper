// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const moduleRoot = join(root, "module");
const manifest = JSON.parse(readFileSync(join(moduleRoot, "module.json"), "utf8"));

assert.ok(Array.isArray(manifest.languages), "module.json must define Foundry language packs");
assert.ok(manifest.languages.length >= 1, "At least the English language pack is required");

const codes = manifest.languages.map(({ lang }) => lang);
assert.equal(new Set(codes).size, codes.length, "Language codes must be unique");
assert.equal(codes[0], "en", "English must remain the default and first language pack");
assert.ok(codes.includes("en"), "English baseline language pack is missing");

const packs = new Map();
for (const language of manifest.languages) {
  assert.match(language.lang, /^[a-z]{2,3}(?:-[a-z0-9]+)*$/, `Invalid lower-case language code: ${language.lang}`);
  assert.ok(typeof language.name === "string" && language.name.trim(), `Missing language name for ${language.lang}`);
  assert.equal(language.path, `lang/${language.lang}.json`, `Non-standard language path for ${language.lang}`);
  const entries = JSON.parse(readFileSync(join(moduleRoot, language.path), "utf8"));
  assert.equal(Object.getPrototypeOf(entries), Object.prototype, `${language.path} must contain a JSON object`);
  assert.ok(Object.keys(entries).length > 0, `${language.path} is empty`);
  for (const [key, value] of Object.entries(entries)) {
    assert.match(key, /^SLK\.[A-Za-z0-9_.]+$/, `Unnamespaced localization key in ${language.path}: ${key}`);
    assert.ok(typeof value === "string" && value.trim(), `Empty or non-string localization value in ${language.path}: ${key}`);
  }
  packs.set(language.lang, entries);
}

const english = packs.get("en");
const englishKeys = Object.keys(english).sort();
const placeholders = (text) => [...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
for (const [lang, entries] of packs) {
  assert.deepEqual(Object.keys(entries).sort(), englishKeys, `${lang} keys differ from the English baseline`);
  for (const key of englishKeys) {
    assert.deepEqual(placeholders(entries[key]), placeholders(english[key]), `${lang} placeholder mismatch for ${key}`);
  }
}

const files = [
  "scripts/main.mjs",
  "scripts/settings.mjs",
  "scripts/scene-service.mjs",
  "scripts/time-systems.mjs",
  "scripts/applications/control-panel.mjs",
  "scripts/applications/floating-board.mjs",
  "scripts/applications/settings-hub.mjs",
  "scripts/ui/action-runner.mjs",
  "scripts/ui/context.mjs",
  "scripts/ui/fog-reset.mjs",
  "scripts/ui/how-to.mjs",
  "scripts/ui/scene-controls.mjs",
  "scripts/ui/settings-launcher.mjs",
  "templates/control-panel.hbs",
  "templates/floating-board.hbs",
  "templates/settings-hub.hbs"
];
const source = files.map((path) => readFileSync(join(moduleRoot, path), "utf8")).join("\n");
const literalKeys = new Set([...source.matchAll(/SLK\.[A-Za-z0-9_.]+/g)].map((match) => match[0]));
const dynamicBases = new Set(["SLK.Mode", "SLK.Mode.", "SLK.Moon", "SLK.Moon.", "SLK.Season", "SLK.Season.", "SLK.SeasonMode", "SLK.SeasonMode.", "SLK.LightMode", "SLK.LightMode.", "SLK.Band", "SLK.Band."]);
for (const key of literalKeys) {
  if (dynamicBases.has(key)) continue;
  assert.ok(Object.hasOwn(english, key), `English baseline is missing referenced key: ${key}`);
}

const dynamicKeys = [
  "SLK.Mode.Feel", "SLK.Mode.Phase", "SLK.Mode.Clock", "SLK.Mode.Imperial",
  "SLK.Moon.New", "SLK.Moon.Crescent", "SLK.Moon.Quarter", "SLK.Moon.Gibbous", "SLK.Moon.Full",
  "SLK.Season.Spring", "SLK.Season.Summer", "SLK.Season.Autumn", "SLK.Season.Winter",
  "SLK.SeasonMode.Manual", "SLK.SeasonMode.Calendar",
  "SLK.LightMode.Automatic", "SLK.LightMode.Always", "SLK.LightMode.Off", "SLK.LightMode.Preserve",
  "SLK.Band.bright", "SLK.Band.daylight", "SLK.Band.dim", "SLK.Band.twilight", "SLK.Band.night", "SLK.Band.pitch"
];
for (const key of dynamicKeys) assert.ok(Object.hasOwn(english, key), `English baseline is missing dynamic key: ${key}`);

const templates = files.filter((path) => path.endsWith(".hbs")).map((path) => readFileSync(join(moduleRoot, path), "utf8")).join("\n");
const textWithoutHandlebars = templates.replace(/\{\{[\s\S]*?\}\}/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
assert.doesNotMatch(textWithoutHandlebars, /\p{L}{2,}/u, `Hard-coded user-facing template text detected: ${textWithoutHandlebars}`);

const settings = readFileSync(join(moduleRoot, "scripts/settings.mjs"), "utf8");
assert.doesNotMatch(settings, /register\([^)]*(?:language|locale)/i, "Do not add a module-specific language selector; Foundry owns language selection");
assert.doesNotMatch(templates, /data-action=["'][^"']*(?:language|locale)/i, "Do not put language switching in module dashboards");

console.log(`Foundry localization contract passed: ${packs.size} language packs, ${englishKeys.length} namespaced keys, English baseline first.`);
