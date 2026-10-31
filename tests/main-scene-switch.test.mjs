// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

class MockApplicationV2 {
  constructor(options = {}) {
    this.position = options.position ?? {};
    this.rendered = false;
  }
  async _prepareContext() { return {}; }
  _onRender() {}
  _onPosition() {}
  _onClose() {}
  async render() { this.rendered = true; return this; }
  async close() { this.rendered = false; return this; }
  setPosition(position) { this.position = { ...this.position, ...position }; return this.position; }
}
class MockDialogV2 { static async confirm() { return false; } static async wait() { return null; } }

function setPath(object, path, value) {
  const parts = path.split(".");
  let cursor = object;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = structuredClone(value);
}

function sceneFixture(id, darknessLevel) {
  let state = {
    mode: "feel",
    feel: Math.round(darknessLevel * 100),
    phase: 50,
    clockMinutes: 720,
    imperialBell: 17,
    moonIndex: 0,
    season: "spring",
    seasonMode: "manual",
    ordinaryDate: { year: 2026, month: 8, day: 2 },
    imperialDate: { year: 443, month: 3, day: 3 },
    lightMode: "automatic",
    naturalLightCutoff: 72,
    transitionSeconds: 0
  };
  const scene = {
    id,
    name: id,
    fog: { exploration: true },
    tokenVision: true,
    environment: {
      darknessLevel,
      darknessLevelLock: false,
      globalLight: { enabled: 1, darkness: { min: 0, max: 0.72 } }
    },
    updates: [],
    canUserModify: () => true,
    getFlag: () => structuredClone(state),
    update: async (changes, options) => {
      scene.updates.push({ changes: structuredClone(changes), options: structuredClone(options) });
      for (const [path, value] of Object.entries(changes)) {
        if (path === "flags.runyth-scene-lightkeeper.state") state = structuredClone(value);
        else setPath(scene, path, value);
      }
      return scene;
    }
  };
  return scene;
}

const once = new Map();
const on = new Map();
const values = new Map([
  ["showSceneControl", true],
  ["floatingEnabled", false],
  ["autoOpenFloating", false],
  ["showFirstRun", false],
  ["sceneSyncMode", "grade"],
  ["sceneSyncInitialLoad", false],
  ["defaultSeason", "spring"],
  ["defaultSeasonMode", "manual"],
  ["modeSwitchBehavior", "apply"],
  ["controlChangeBehavior", "immediate"],
  ["defaultLightMode", "automatic"],
  ["defaultNaturalLightCutoff", 72],
  ["seasonalEnabled", true],
  ["deriveSeasonFromImperialMonth", false],
  ["currentLightingSnapshot", {}],
  ["panelState", {}],
  ["floatingState", {}],
  ["settingsHubState", {}]
]);
const scenes = new Map();
const moduleRecord = { version: "1.1.3" };

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: MockApplicationV2,
      DialogV2: MockDialogV2,
      HandlebarsApplicationMixin: (Base) => class extends Base {}
    }
  },
  utils: { deepClone: structuredClone }
};
globalThis.Handlebars = {
  helpers: {},
  registerHelper(name, callback) { this.helpers[name] = callback; }
};
globalThis.Hooks = {
  once(name, callback) { once.set(name, callback); },
  on(name, callback) { on.set(name, callback); },
  callAll() {}
};
globalThis.game = {
  ready: true,
  user: { id: "gm", isGM: true },
  modules: { get: (id) => id === "runyth-scene-lightkeeper" ? moduleRecord : null },
  settings: {
    register() {},
    registerMenu() {},
    get: (_module, key) => values.get(key),
    set: async (_module, key, value) => values.set(key, structuredClone(value))
  },
  i18n: { localize: (key) => key, format: (key) => key },
  scenes: { get: (id) => scenes.get(id), active: null }
};
globalThis.canvas = { scene: null, fog: {}, environment: {} };
globalThis.ui = {
  controls: { render: async () => {} },
  notifications: { info() {}, warn() {}, error() {} }
};

await import("../module/scripts/main.mjs?scene-switch-lifecycle");
once.get("init")();

async function flush() {
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

test("rapid scene switches carry the original current illumination to the final scene", async () => {
  const source = sceneFixture("source", 0.71);
  source.environment.globalLight = { enabled: 1, darkness: { min: 0.08, max: 0.61 } };
  const middle = sceneFixture("middle", 0.15);
  const target = sceneFixture("target", 0.24);
  for (const scene of [source, middle, target]) scenes.set(scene.id, scene);

  globalThis.canvas.scene = source;
  on.get("canvasReady")({ scene: source });
  await flush();

  globalThis.canvas.scene = middle;
  on.get("canvasReady")({ scene: middle });
  globalThis.canvas.scene = target;
  on.get("canvasReady")({ scene: target });
  await flush();

  assert.equal(middle.updates.length, 0, "superseded intermediate scene should not be written");
  assert.equal(target.updates.length, 1);
  const changes = target.updates[0].changes;
  assert.equal(changes["environment.darknessLevel"], 0.71);
  assert.equal(changes["environment.globalLight.enabled"], 1);
  assert.equal(changes["environment.globalLight.darkness.min"], 0.08);
  assert.equal(changes["environment.globalLight.darkness.max"], 0.61);
  assert.ok(!Object.hasOwn(changes, "fog.exploration"));
  assert.ok(!Object.hasOwn(changes, "tokenVision"));
});
