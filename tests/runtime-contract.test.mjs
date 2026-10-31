// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("runtime exposes permanent entry points and the requested public API", () => {
  const main = readFileSync("module/scripts/main.mjs", "utf8");
  for (const method of ["open", "openSettings", "openFloating", "toggleFloating", "showGuide", "captureCurrentLighting", "syncLightingToScene", "registerTimeSystem", "unregisterTimeSystem", "getTimeSystems", "setFeel", "setPhase", "setClock", "setImperialBell", "setMoon", "setSeason", "setFogExploration", "setTokenVision", "requestFogReset", "resetFog"]) {
    assert.match(main, new RegExp(`\\b${method}\\b`));
  }
  assert.match(main, /getSceneControlButtons/);
});

test("window persistence is client-scoped and all major windows are resizable ApplicationV2", () => {
  const settings = readFileSync("module/scripts/settings.mjs", "utf8");
  assert.match(settings, /PANEL_STATE[\s\S]*scope:\s*"client"/);
  assert.match(settings, /FLOATING_STATE[\s\S]*scope:\s*"client"/);
  assert.match(settings, /SETTINGS_HUB_STATE[\s\S]*scope:\s*"client"/);
  assert.match(settings, /SCENE_SYNC_MODE[\s\S]*scope:\s*"world"/);
  assert.match(settings, /CURRENT_LIGHTING_SNAPSHOT[\s\S]*config:\s*false/);
  for (const file of ["control-panel.mjs", "floating-board.mjs", "settings-hub.mjs"]) {
    const source = readFileSync(`module/scripts/applications/${file}`, "utf8");
    assert.match(source, /HandlebarsApplicationMixin\(ApplicationV2\)/);
    assert.match(source, /resizable:\s*true/);
  }
});

test("fog reset is explicit, GM-only, and uses the public FogManager", () => {
  const source = readFileSync("module/scripts/scene-service.mjs", "utf8");
  assert.match(source, /if \(!game\.user\.isGM\)/);
  assert.match(source, /canvas\.fog\.reset\(\)/);
  assert.doesNotMatch(source, /deleteAll|FogExploration\.deleteDocuments/);
});

test("global illumination defaults to the intuitive automatic wrapper while preserve remains available", () => {
  const constants = readFileSync("module/scripts/constants.mjs", "utf8");
  const service = readFileSync("module/scripts/scene-service.mjs", "utf8");
  assert.match(constants, /lightMode:\s*"automatic"/);
  assert.match(service, /case "preserve":[\s\S]*return \{\}/);
});

test("templates expose all requested intuitive control surfaces", () => {
  const panel = readFileSync("module/templates/control-panel.hbs", "utf8");
  for (const field of ["feel", "phase", "clockMinutes", "ordinaryYear", "ordinaryMonth", "ordinaryDay", "imperialBell", "imperialYear", "imperialMonth", "imperialDay", "moonIndex", "seasonMode", "season", "lightMode", "naturalLightCutoff", "transitionSeconds"]) {
    assert.match(panel, new RegExp(`data-slk-field="${field}"`));
  }
  for (const action of ["switchMode", "applyScheme", "discardChanges", "applyPreset", "openGuide", "toggleVision", "toggleFog", "resetFog", "toggleLock", "toggleFloating"]) {
    assert.match(panel, new RegExp(`data-action="${action}"`));
  }
  const floating = readFileSync("module/templates/floating-board.hbs", "utf8");
  for (const field of ["feel", "phase", "clockMinutes", "imperialBell", "moonIndex", "season"]) {
    assert.match(floating, new RegExp(`data-slk-quick="${field}"`));
  }
});

test("every module-owned dialog safely permits native window closure", () => {
  for (const file of ["module/scripts/main.mjs", "module/scripts/ui/fog-reset.mjs", "module/scripts/ui/how-to.mjs"]) {
    const source = readFileSync(file, "utf8");
    const dialogs = (source.match(/DialogV2\.(?:confirm|wait)\(/g) ?? []).length;
    const safeClose = source.split("rejectClose: false").length - 1;
    assert.equal(safeClose, dialogs, file);
  }
});

test("fog reset confirmation is centralized and cannot be bypassed by the panel or toolbar", () => {
  const fog = readFileSync("module/scripts/ui/fog-reset.mjs", "utf8");
  assert.match(fog, /CONFIRM_FOG_RESET/);
  assert.match(fog, /DialogV2\.confirm/);
  assert.match(fog, /await resetFog\(scene\)/);
  for (const file of ["module/scripts/applications/control-panel.mjs", "module/scripts/ui/scene-controls.mjs"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /requestFogReset/);
    assert.doesNotMatch(source, /DialogV2\.confirm/);
  }
});


test("scene-switch updates cannot force closed module windows back open", () => {
  for (const file of ["module/scripts/main.mjs", "module/scripts/applications/control-panel.mjs", "module/scripts/applications/floating-board.mjs"]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /render\(\{ force: true \}\)[\s\S]{0,120}(scene-switch|refreshApps|patchAndApplySceneState)/, file);
  }
  const main = readFileSync("module/scripts/main.mjs", "utf8");
  assert.match(main, /renderIfOpen/);
  assert.match(main, /force: false/);
});

test("scene-switch synchronization is isolated from fog, vision, tokens, walls, and ambient lights", () => {
  const service = readFileSync("module/scripts/scene-service.mjs", "utf8");
  assert.match(service, /syncLightingToScene/);
  assert.doesNotMatch(service.match(/export async function syncLightingToScene[\s\S]*?export async function setDarknessLock/)?.[0] ?? "", /tokenVision|fog\.|walls|tokens|lights/);
});


test("release tooling produces isolated install, source, and documentation archives", () => {
  const packager = readFileSync("tools/package.py", "utf8");
  assert.match(packager, /runyth-scene-lightkeeper-v\{VERSION\}-mod\.zip/);
  assert.match(packager, /runyth-scene-lightkeeper-v\{VERSION\}-src\.zip/);
  assert.match(packager, /runyth-scene-lightkeeper-v\{VERSION\}-doc\.zip/);
  assert.match(packager, /DOCUMENTATION_ROOT = f"runyth-scene-lightkeeper-v\{VERSION\}-doc"/);

  const gate = readFileSync("tools/release-gate.py", "utf8");
  assert.match(gate, /verify_install_archive/);
  assert.match(gate, /verify_source_archive/);
  assert.match(gate, /verify_documentation_archive/);
  assert.match(gate, /documentation archive rebuilt from source ZIP/);
});
