// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { computeDarkness } from "../module/scripts/state.mjs";
import {
  captureCurrentLighting,
  getCurrentLightingSnapshot,
  syncLightingToScene
} from "../module/scripts/scene-service.mjs";

function installGlobals() {
  const settings = new Map([
    ["defaultSeason", "spring"],
    ["defaultLightMode", "automatic"],
    ["defaultNaturalLightCutoff", 72],
    ["seasonalEnabled", true],
    ["deriveSeasonFromImperialMonth", false],
    ["sceneSyncMode", "off"],
    ["currentLightingSnapshot", {}]
  ]);
  globalThis.foundry = { utils: { deepClone: structuredClone } };
  globalThis.game = {
    user: { id: "gm", isGM: true },
    settings: {
      get: (_module, key) => settings.get(key),
      set: async (_module, key, value) => settings.set(key, structuredClone(value))
    },
    i18n: {
      localize: (key) => key,
      format: (key, data) => `${key}:${JSON.stringify(data)}`
    },
    scenes: { active: null }
  };
  globalThis.ui = { notifications: { info() {}, error() {} } };
  globalThis.canvas = { scene: null, fog: {} };
  return settings;
}

function setPath(object, path, value) {
  const parts = path.split(".");
  let cursor = object;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = structuredClone(value);
}

function sceneFixture({ id, state, darknessLevel, globalLight }) {
  let storedState = structuredClone(state);
  const scene = {
    id,
    name: id,
    fog: { exploration: true },
    tokenVision: true,
    environment: {
      darknessLevel,
      darknessLevelLock: false,
      globalLight: structuredClone(globalLight)
    },
    updates: [],
    getFlag: () => structuredClone(storedState),
    canUserModify: () => true,
    update: async (changes, options) => {
      scene.updates.push({ changes: structuredClone(changes), options: structuredClone(options) });
      for (const [path, value] of Object.entries(changes)) {
        if (path === "flags.runyth-scene-lightkeeper.state") storedState = structuredClone(value);
        else setPath(scene, path, value);
      }
      return scene;
    }
  };
  return scene;
}

const sourceState = {
  mode: "clock",
  feel: 12,
  phase: 31,
  clockMinutes: 315,
  imperialBell: 8,
  moonIndex: 4,
  season: "winter",
  seasonMode: "calendar",
  ordinaryDate: { year: 2026, month: 12, day: 21 },
  imperialDate: { year: 443, month: 3, day: 17 },
  lightMode: "preserve",
  naturalLightCutoff: 68,
  transitionSeconds: 4
};

const targetState = {
  mode: "imperial",
  feel: 10,
  phase: 80,
  clockMinutes: 900,
  imperialBell: 27,
  moonIndex: 0,
  season: "summer",
  seasonMode: "manual",
  ordinaryDate: { year: 2025, month: 6, day: 2 },
  imperialDate: { year: 444, month: 12, day: 2 },
  lightMode: "off",
  naturalLightCutoff: 91,
  transitionSeconds: 0
};

test("grade synchronization copies exact visible darkness and global illumination only", async () => {
  installGlobals();
  const source = sceneFixture({
    id: "source",
    state: sourceState,
    darknessLevel: 0.673,
    globalLight: { enabled: 1, darkness: { min: 0.12, max: 0.63 } }
  });
  const target = sceneFixture({
    id: "target",
    state: targetState,
    darknessLevel: 0.2,
    globalLight: { enabled: 0, darkness: { min: 0, max: 1 } }
  });
  globalThis.canvas.scene = target;

  const result = await syncLightingToScene(target, { mode: "grade", sourceScene: source });

  assert.equal(result.applied, true);
  assert.equal(target.updates.length, 1);
  const changes = target.updates[0].changes;
  assert.equal(changes["environment.darknessLevel"], 0.673);
  assert.equal(changes["environment.globalLight.enabled"], 1);
  assert.equal(changes["environment.globalLight.darkness.min"], 0.12);
  assert.equal(changes["environment.globalLight.darkness.max"], 0.63);
  assert.equal(changes["flags.runyth-scene-lightkeeper.state"].mode, "feel");
  assert.equal(changes["flags.runyth-scene-lightkeeper.state"].feel, 67);
  assert.equal(changes["flags.runyth-scene-lightkeeper.state"].clockMinutes, targetState.clockMinutes);
  assert.equal(changes["flags.runyth-scene-lightkeeper.state"].lightMode, sourceState.lightMode);
  assert.ok(!Object.hasOwn(changes, "fog.exploration"));
  assert.ok(!Object.hasOwn(changes, "tokenVision"));
});

test("profile synchronization carries time, moon, season mode, both dates, and global light", async () => {
  installGlobals();
  const source = sceneFixture({
    id: "source",
    state: sourceState,
    darknessLevel: 0.91,
    globalLight: { enabled: 1, darkness: { min: 0, max: 0.68 } }
  });
  const target = sceneFixture({
    id: "target",
    state: targetState,
    darknessLevel: 0.1,
    globalLight: { enabled: 0, darkness: { min: 0, max: 1 } }
  });
  globalThis.canvas.scene = target;

  await syncLightingToScene(target, { mode: "profile", sourceScene: source });
  const changes = target.updates[0].changes;
  const state = changes["flags.runyth-scene-lightkeeper.state"];
  assert.equal(state.mode, sourceState.mode);
  assert.equal(state.clockMinutes, sourceState.clockMinutes);
  assert.equal(state.moonIndex, sourceState.moonIndex);
  assert.equal(state.season, sourceState.season);
  assert.equal(state.seasonMode, sourceState.seasonMode);
  assert.deepEqual(state.ordinaryDate, sourceState.ordinaryDate);
  assert.deepEqual(state.imperialDate, sourceState.imperialDate);
  assert.equal(changes["environment.darknessLevel"], computeDarkness(state, {
    seasonalEnabled: true,
    deriveSeasonFromImperialMonth: false,
    defaultSeason: "spring"
  }));
  assert.equal(changes["environment.globalLight.darkness.max"], 0.68);
});

test("remembered lighting supports initial-load synchronization without a source scene", async () => {
  installGlobals();
  const source = sceneFixture({
    id: "source",
    state: sourceState,
    darknessLevel: 0.54,
    globalLight: { enabled: 1, darkness: { min: 0, max: 0.7 } }
  });
  globalThis.canvas.scene = source;
  await captureCurrentLighting(source);
  assert.equal(getCurrentLightingSnapshot().sourceSceneId, "source");

  const target = sceneFixture({
    id: "target",
    state: targetState,
    darknessLevel: 0.1,
    globalLight: { enabled: 0, darkness: { min: 0, max: 1 } }
  });
  globalThis.canvas.scene = target;
  const result = await syncLightingToScene(target, { mode: "grade" });
  assert.equal(result.applied, true);
  assert.equal(target.updates[0].changes["environment.darknessLevel"], 0.54);
});

test("disabled synchronization and already matching scenes avoid scene writes", async () => {
  installGlobals();
  const scene = sceneFixture({
    id: "same",
    state: sourceState,
    darknessLevel: computeDarkness(sourceState, { seasonalEnabled: true }),
    globalLight: { enabled: 1, darkness: { min: 0, max: 0.68 } }
  });
  const disabled = await syncLightingToScene(scene, { mode: "off", sourceScene: scene });
  assert.equal(disabled.reason, "disabled");
  assert.equal(scene.updates.length, 0);

  const matched = await syncLightingToScene(scene, { mode: "profile", sourceScene: scene });
  assert.equal(matched.reason, "already-matched");
  assert.equal(scene.updates.length, 0);
});
