// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "module/module.json"), "utf8"));
const packs = Object.fromEntries(manifest.languages.map(({ lang, path }) => [
  lang,
  JSON.parse(readFileSync(join(root, "module", path), "utf8"))
]));

test("Foundry manifest exposes modular language packs with English as the baseline", () => {
  assert.deepEqual(manifest.languages.map(({ lang }) => lang), ["en", "de"]);
  assert.equal(manifest.languages[0].path, "lang/en.json");
  assert.ok(Object.keys(packs.en).every((key) => key.startsWith("SLK.")));
});

test("all bundled languages implement the complete English contract", () => {
  const expected = Object.keys(packs.en).sort();
  for (const [language, entries] of Object.entries(packs)) {
    assert.deepEqual(Object.keys(entries).sort(), expected, `${language} must match the English key contract`);
  }
});

test("format placeholders remain identical in every bundled language", () => {
  const variables = (value) => [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
  for (const [language, entries] of Object.entries(packs)) {
    for (const key of Object.keys(packs.en)) {
      assert.deepEqual(variables(entries[key]), variables(packs.en[key]), `${language}:${key}`);
    }
  }
});

test("the default English pack contains the localized release surfaces", () => {
  assert.equal(packs.en["SLK.FirstRun.Title"], "Scene Lightkeeper {version}");
  assert.match(packs.en["SLK.SettingsHub.Footer"], /\{version\}/);
  assert.match(packs.en["SLK.SettingsHub.Footer"], /\{foundryVersion\}/);
});

test("no module-specific language selector competes with Foundry core", () => {
  const settings = readFileSync(join(root, "module/scripts/settings.mjs"), "utf8");
  const templates = ["control-panel.hbs", "floating-board.hbs", "settings-hub.hbs"]
    .map((name) => readFileSync(join(root, "module/templates", name), "utf8"))
    .join("\n");
  assert.doesNotMatch(settings, /(?:language|locale)\s*:/i);
  assert.doesNotMatch(templates, /data-action=["'][^"']*(?:language|locale)/i);
});
