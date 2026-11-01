// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import {
  applySceneState,
  getSceneState,
  patchAndApplySceneState,
  resetFog,
  setDarknessLock,
  setFogExploration,
  setTokenVision
} from "../module/scripts/scene-service.mjs";

function installGlobals(overrides = {}) {
  const settings = new Map([
    ["defaultSeason", "spring"],
    ["defaultLightMode", "preserve"],
    ["defaultNaturalLightCutoff", 72],
    ["seasonalEnabled", true],
    ["deriveSeasonFromImperialMonth", false]
  ]);
  globalThis.game = {
    user: { id: "gm", isGM: true },
    settings: { get: (_module, key) => settings.get(key) },
    i18n: {
      localize: (key) => key,
      format: (key, data) => `${key}:${JSON.stringify(data)}`
    },
    scenes: { active: null },
    ...overrides.game
  };
  globalThis.ui = { notifications: { info: () => {}, error: () => {} }, ...overrides.ui };
  globalThis.canvas = { scene: null, fog: {}, ...overrides.canvas };
  return settings;
}

function sceneFixture(flag = {}) {
  const updates = [];
  return {
    id: "scene-1",
    name: "Test Scene",
    fog: { exploration: true },
    tokenVision: true,
    environment: { darknessLevelLock: false },
    getFlag: () => flag,
    canUserModify: () => true,
    update: async (changes, options) => {
      updates.push({ changes, options });
      return true;
    },
    updates
  };
}

test("applying perceived darkness performs one contained Scene update", async () => {
  installGlobals();
  const scene = sceneFixture();
  globalThis.canvas.scene = scene;
  const state = await applySceneState(scene, { mode: "feel", feel: 64 }, { notify: false });
  assert.equal(scene.updates.length, 1);
  const { changes, options } = scene.updates[0];
  assert.equal(changes["environment.darknessLevel"], 0.64);
  assert.equal(changes["flags.runyth-scene-lightkeeper.state"].feel, 64);
  assert.equal(changes["environment.globalLight.enabled"], undefined);
  assert.equal(options.sceneLightkeeper, true);
  assert.equal(state.updatedBy, "gm");
});

test("automatic global illumination writes an explicit bounded cutoff", async () => {
  installGlobals();
  const scene = sceneFixture();
  await applySceneState(scene, { mode: "feel", feel: 50, lightMode: "automatic", naturalLightCutoff: 76 }, { notify: false });
  const changes = scene.updates[0].changes;
  assert.equal(changes["environment.globalLight.enabled"], 1);
  assert.equal(changes["environment.globalLight.darkness.min"], 0);
  assert.equal(changes["environment.globalLight.darkness.max"], 0.76);
});

test("patching state preserves nested Imperial date fields", async () => {
  installGlobals();
  const scene = sceneFixture({ mode: "imperial", imperialBell: 8, imperialDate: { year: 443, month: 3, day: 3 } });
  globalThis.canvas.scene = scene;
  await patchAndApplySceneState({ imperialDate: { day: 12 } }, { scene, notify: false });
  const stored = scene.updates[0].changes["flags.runyth-scene-lightkeeper.state"];
  assert.deepEqual(stored.imperialDate, { year: 443, month: 3, day: 12 });
});

test("scene mutations reject an unauthorized user", async () => {
  installGlobals({ game: { user: { id: "player", isGM: false } } });
  const scene = sceneFixture();
  scene.canUserModify = () => false;
  await assert.rejects(() => applySceneState(scene, { mode: "feel", feel: 20 }, { notify: false }), /SLK.Error.Permission/);
  await assert.rejects(() => setTokenVision(false, scene), /SLK.Error.Permission/);
  await assert.rejects(() => setFogExploration(false, scene), /SLK.Error.Permission/);
  await assert.rejects(() => setDarknessLock(true, scene), /SLK.Error.Permission/);
  assert.equal(scene.updates.length, 0);
});

test("native vision, fog, and lock toggles update only their exact fields", async () => {
  installGlobals();
  const scene = sceneFixture();
  await setTokenVision(false, scene);
  await setFogExploration(false, scene);
  await setDarknessLock(true, scene);
  assert.deepEqual(scene.updates.map(({ changes }) => changes), [
    { tokenVision: false },
    { "fog.exploration": false },
    { "environment.darknessLevelLock": true }
  ]);
});

test("fog reset is limited to a GM and the active canvas Scene", async () => {
  installGlobals();
  const scene = sceneFixture();
  let resets = 0;
  globalThis.canvas.scene = scene;
  globalThis.canvas.fog.reset = async () => { resets += 1; };
  await resetFog(scene);
  assert.equal(resets, 1);

  const other = sceneFixture();
  other.id = "scene-2";
  await assert.rejects(() => resetFog(other), /SLK.Error.FogActiveScene/);

  globalThis.game.user.isGM = false;
  await assert.rejects(() => resetFog(scene), /SLK.Error.Permission/);
});

test("stored malformed Scene flags normalize to safe values", () => {
  installGlobals();
  const scene = sceneFixture({ mode: "unknown", feel: -50, imperialBell: 100 });
  const state = getSceneState(scene);
  assert.equal(state.mode, "feel");
  assert.equal(state.feel, 0);
  assert.equal(state.imperialBell, 33);
});

test("all global-light modes are explicit and preserve does not write global-light fields", async () => {
  installGlobals();
  for (const [mode, expected] of [
    ["always", { enabled: 1, max: 1 }],
    ["off", { enabled: 0, max: undefined }],
    ["preserve", { enabled: undefined, max: undefined }]
  ]) {
    const scene = sceneFixture();
    await applySceneState(scene, { mode: "feel", feel: 75, lightMode: mode }, { notify: false });
    const changes = scene.updates[0].changes;
    assert.equal(changes["environment.globalLight.enabled"], expected.enabled, mode);
    assert.equal(changes["environment.globalLight.darkness.max"], expected.max, mode);
  }
});

test("transition duration is clamped and passed as milliseconds", async () => {
  installGlobals();
  const scene = sceneFixture();
  await applySceneState(scene, { mode: "feel", feel: 20, transitionSeconds: 99 }, { notify: false });
  assert.equal(scene.updates[0].options.animateDarkness, 30000);
  assert.equal(scene.updates[0].changes["flags.runyth-scene-lightkeeper.state"].transitionSeconds, 30);
});

test("all mutation helpers report a clean no-scene error", async () => {
  installGlobals();
  await assert.rejects(() => applySceneState(null, {}, { notify: false }), /SLK.Error.NoScene/);
  await assert.rejects(() => setTokenVision(true, null), /SLK.Error.NoScene/);
  await assert.rejects(() => setFogExploration(true, null), /SLK.Error.NoScene/);
  await assert.rejects(() => setDarknessLock(true, null), /SLK.Error.NoScene/);
});
