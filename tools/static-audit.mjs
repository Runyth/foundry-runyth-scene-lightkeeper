// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const moduleRoot = join(root, "module");
const manifest = JSON.parse(readFileSync(join(moduleRoot, "module.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.equal(manifest.id, "runyth-scene-lightkeeper");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(packageJson.version, manifest.version, "package.json and module.json versions differ");
assert.equal(manifest.compatibility.minimum, "13");
assert.equal(manifest.compatibility.verified, "13.351");
assert.equal(manifest.compatibility.maximum, "13");
for (const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map((language) => language.path)]) {
  assert.ok(existsSync(join(moduleRoot, path)), `Missing manifest path: ${path}`);
}
function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const production = walk(moduleRoot).filter((path) => /\.(mjs|hbs|css)$/.test(path));
const source = production.map((path) => readFileSync(path, "utf8")).join("\n");
for (const file of production.filter((path) => path.endsWith(".mjs"))) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const resolved = normalize(join(dirname(file), match[1]));
    assert.ok(existsSync(resolved), `Unresolved production import in ${file}: ${match[1]}`);
  }
}
for (const match of source.matchAll(/modules\/runyth-scene-lightkeeper\/(templates\/[^`"']+)/g)) {
  assert.ok(existsSync(join(moduleRoot, match[1])), `Missing runtime template: ${match[1]}`);
}
for (const prohibited of [
  /\bFormApplication\b/,
  /\bApplicationV1\b/,
  /\brenderChatMessage\b/,
  /html\.find\s*\(/,
  /\$\s*\(/,
  /socketlib/i,
  /this\.run\s*\(/,
  /controls\.push\s*\(/
]) assert.ok(!prohibited.test(source), `Prohibited legacy/interference pattern: ${prohibited}`);

const constants = readFileSync(join(moduleRoot, "scripts/constants.mjs"), "utf8");
assert.match(constants, new RegExp(`MODULE_VERSION = "${manifest.version.replaceAll(".", "\\.")}"`));
assert.match(constants, new RegExp(`API_VERSION = "${manifest.version.replaceAll(".", "\\.")}"`));
const packageTool = readFileSync(join(root, "tools/package.py"), "utf8");
assert.match(packageTool, /MANIFEST\["version"\]/);
assert.match(packageTool, /PACKAGE\["version"\] != VERSION/);

for (const file of [
  "scripts/applications/control-panel.mjs",
  "scripts/applications/floating-board.mjs",
  "scripts/applications/settings-hub.mjs",
  "scripts/ui/scene-controls.mjs",
  "scripts/ui/settings-launcher.mjs"
]) {
  const text = readFileSync(join(moduleRoot, file), "utf8");
  assert.match(text, /runUiAction/, `${file} must use the contained ApplicationV2 action runner`);
}

const css = readFileSync(join(moduleRoot, "styles/runyth-scene-lightkeeper.css"), "utf8");
for (const block of css.split("}").map((value) => value.trim()).filter(Boolean)) {
  if (block.startsWith("@media") || block.startsWith("@supports") || block.startsWith("@keyframes")) continue;
  const selector = block.split("{")[0]?.trim();
  if (!selector || selector.includes("from") || selector.includes("to")) continue;
  for (const item of selector.split(",")) assert.ok(item.trim().startsWith(".slk-"), `Unscoped CSS selector: ${item.trim()}`);
}
assert.ok(Array.isArray(manifest.languages) && manifest.languages.length > 0, "Manifest languages are missing");
const languagePacks = new Map(manifest.languages.map((language) => [
  language.lang,
  JSON.parse(readFileSync(join(moduleRoot, language.path), "utf8"))
]));
const en = languagePacks.get("en");
assert.ok(en, "English baseline language pack is missing");
for (const [language, entries] of languagePacks) {
  assert.deepEqual(Object.keys(entries).sort(), Object.keys(en).sort(), `${language} localization keys differ from English`);
}
const keyRefs = [...source.matchAll(/SLK\.[A-Za-z0-9_.]+/g)].map((match) => match[0]);
const dynamicPrefixes = ["SLK.Mode.", "SLK.Moon.", "SLK.Season.", "SLK.SeasonMode.", "SLK.LightMode.", "SLK.Band."];
const dynamicBases = dynamicPrefixes.map((prefix) => prefix.slice(0, -1));
for (const key of new Set(keyRefs)) {
  if (dynamicBases.includes(key)) continue;
  assert.ok(en[key] || dynamicPrefixes.some((prefix) => key.startsWith(prefix)), `Missing localization key: ${key}`);
}

const settings = readFileSync(join(moduleRoot, "scripts/settings.mjs"), "utf8");
assert.match(settings, /MODE_SWITCH_BEHAVIOR[\s\S]*default:\s*MODE_SWITCH_BEHAVIORS\.APPLY/);
assert.match(settings, /CONTROL_CHANGE_BEHAVIOR[\s\S]*default:\s*CONTROL_CHANGE_BEHAVIORS\.IMMEDIATE/);
assert.match(settings, /const shared = \{[\s\S]*scope:\s*"world"[\s\S]*restricted:\s*true/);
assert.match(settings, /CONFIRM_FOG_RESET[\s\S]*default:\s*true/);
assert.match(settings, /DEFAULT_SEASON_MODE[\s\S]*default:\s*SEASON_MODES\.MANUAL/);

const panelTemplate = readFileSync(join(moduleRoot, "templates/control-panel.hbs"), "utf8");
for (const action of ["switchMode", "applyScheme", "discardChanges", "applyPreset", "openGuide", "resetFog"]) {
  assert.match(panelTemplate, new RegExp(`data-action="${action}"`), `Missing panel action: ${action}`);
}
for (const field of ["ordinaryYear", "ordinaryMonth", "ordinaryDay", "seasonMode"]) {
  assert.match(panelTemplate, new RegExp(`data-slk-field="${field}"`), `Missing panel field: ${field}`);
}
for (const value of ["phaseImperialLabel", "clockImperialLabel", "phaseTimeSystems", "clockTimeSystems", "imperialTimeSystems"]) {
  assert.match(panelTemplate, new RegExp(value), `Missing time display surface: ${value}`);
}

const panelSource = readFileSync(join(moduleRoot, "scripts/applications/control-panel.mjs"), "utf8");
assert.match(panelSource, /modeSwitchRequiresApply/);
assert.match(panelSource, /controlChangesRequireApply/);
assert.match(panelSource, /patchAndApplySceneState\(\{ mode \}/);
assert.match(panelSource, /source:\s*"apply-button"/);
assert.match(panelSource, /source:\s*"preset"/);

const timeSystems = readFileSync(join(moduleRoot, "scripts/time-systems.mjs"), "utf8");
for (const symbol of ["registerTimeSystem", "unregisterTimeSystem", "listTimeSystems", "getTimeSystemDisplays"]) {
  assert.match(timeSystems, new RegExp(`export function ${symbol}`));
}
assert.match(timeSystems, /Time-system formatters must return synchronously/);
assert.match(timeSystems, /labelKey/);

const fogReset = readFileSync(join(moduleRoot, "scripts/ui/fog-reset.mjs"), "utf8");
assert.match(fogReset, /SETTINGS\.CONFIRM_FOG_RESET/);
assert.match(fogReset, /DialogV2\.confirm/);
assert.match(fogReset, /rejectClose:\s*false/);
assert.match(fogReset, /await resetFog\(scene\)/);

const guide = readFileSync(join(moduleRoot, "scripts/ui/how-to.mjs"), "utf8");
assert.match(guide, /DialogV2\.wait/);
assert.match(guide, /SLK\.Guide\.StepChoose/);
assert.match(guide, /SLK\.Guide\.StepApply/);
assert.match(guide, /rejectClose:\s*false/);

const controls = readFileSync(join(moduleRoot, "scripts/ui/scene-controls.mjs"), "utf8");
assert.match(controls, /controls\[MODULE_ID\]\s*=/);
assert.match(controls, /activeTool:\s*"openPanel"/);
assert.match(controls, /tools:\s*\{/);
assert.match(controls, /Array\.isArray\(controls\)/);
assert.doesNotMatch(controls, /onChange:\s*\(\)\s*=>\s*globalThis/);
assert.match(controls, /requestFogReset/);
assert.doesNotMatch(controls, /DialogV2\.confirm/);
const service = readFileSync(join(moduleRoot, "scripts/scene-service.mjs"), "utf8");
assert.match(service, /canvas\.fog\.reset\(\)/);
assert.match(service, /canManageScene/);
assert.match(service, /"environment\.darknessLevel"/);
assert.match(service, /syncLightingToScene/);
assert.match(service, /CURRENT_LIGHTING_SNAPSHOT/);
const floatingBoard = readFileSync(join(moduleRoot, "scripts/applications/floating-board.mjs"), "utf8");
const floatingTemplate = readFileSync(join(moduleRoot, "templates/floating-board.hbs"), "utf8");
assert.match(floatingBoard, /minimizable:\s*false/);
assert.match(floatingBoard, /async close\(options = \{\}\)/);
assert.doesNotMatch(floatingBoard, /sceneLightkeeperExplicitClose/);
assert.match(floatingBoard, /closeExplicitly/);
assert.match(floatingBoard, /ensureStickyPresence/);
assert.match(floatingBoard, /visibilitychange/);
assert.match(floatingBoard, /addEventListener\?\.\("focus"/);
assert.match(floatingBoard, /this\.window\?\.close/);
assert.match(floatingTemplate, /data-action="closeBoard"/);
assert.match(floatingTemplate, /controlBehaviorLabel/);
assert.match(floatingTemplate, /#if showApplyControls[\s\S]*data-action="applyChanges"/);

const settingsLauncher = readFileSync(join(moduleRoot, "scripts/ui/settings-launcher.mjs"), "utf8");
assert.match(settingsLauncher, /game\.user\?\.isGM/);
assert.match(settingsLauncher, /SETTINGS_LAUNCHER_ID/);
assert.match(settingsLauncher, /root\.querySelector\(`#\$\{SETTINGS_LAUNCHER_ID\}`\)/);
assert.match(settingsLauncher, /SceneLightkeeper\?\.open/);
assert.match(settingsLauncher, /SceneLightkeeper\?\.toggleFloating/);

const main = readFileSync(join(moduleRoot, "scripts/main.mjs"), "utf8");
assert.match(main, /Hooks\.on\("canvasReady", queueSceneSynchronization\)/);
assert.match(main, /Hooks\.on\("renderSettings", renderSettingsLauncher\)/);
assert.match(main, /renderIfOpen/);
assert.match(main, /sceneSyncGeneration/);
assert.match(main, /function openFloating\(\)/);
assert.match(main, /function toggleFloating\(\)\s*\{\s*return openFloating\(\)/);
for (const method of ["openFloating", "showGuide", "registerTimeSystem", "unregisterTimeSystem", "getTimeSystems", "requestFogReset"]) {
  assert.match(main, new RegExp(`\\b${method}\\b`), `Public API is missing ${method}`);
}
assert.match(main, /sceneLightkeeperReady/);

assert.match(packageTool, /runyth-scene-lightkeeper-v\{VERSION\}-doc\.zip/);
assert.match(packageTool, /DOCUMENTATION_ROOT/);
const releaseGate = readFileSync(join(root, "tools/release-gate.py"), "utf8");
assert.match(releaseGate, /verify_documentation_archive/);
assert.match(releaseGate, /documentation archive rebuilt from source ZIP/);

console.log(`Static Foundry v13 audit passed: ${production.length} runtime source files, ${languagePacks.size} modular language packs, ${Object.keys(en).length} English baseline keys.`);
