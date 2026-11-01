// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

class MockApplicationV2 {
  static instances = [];
  constructor(options = {}) {
    this.position = options.position ?? {};
    this.rendered = false;
    this.closeCalls = 0;
    this.bringToFrontCalls = 0;
    MockApplicationV2.instances.push(this);
  }
  async _prepareContext() { return {}; }
  _onRender() {}
  _onPosition() {}
  _onClose() {}
  async render() { this.rendered = true; return this; }
  async close() { this.closeCalls += 1; this.rendered = false; return this; }
  bringToFront() { this.bringToFrontCalls += 1; }
}
class MockDialogV2 { static async confirm() { return false; } }
const once = new Map();
const on = new Map();
const registered = [];
const menus = [];
const values = new Map([
  ["floatingEnabled", true],
  ["autoOpenFloating", false],
  ["showFirstRun", false],
  ["showSceneControl", true],
  ["panelState", {}],
  ["floatingState", {}],
  ["settingsHubState", {}],
  ["sceneSyncMode", "off"],
  ["sceneSyncInitialLoad", false],
  ["currentLightingSnapshot", {}]
]);
const moduleRecord = { version: "1.1.8" };

globalThis.foundry = {
  applications: { api: { ApplicationV2: MockApplicationV2, DialogV2: MockDialogV2, HandlebarsApplicationMixin: (Base) => class extends Base {} } },
  utils: { deepClone: structuredClone }
};
globalThis.Handlebars = {
  helpers: {},
  registerHelper(name, callback) { this.helpers[name] = callback; }
};
const emitted = [];
globalThis.Hooks = {
  once(name, callback) { once.set(name, callback); },
  on(name, callback) { on.set(name, callback); },
  callAll(name, payload) { emitted.push({ name, payload }); }
};
globalThis.game = {
  user: { id: "gm", isGM: true },
  modules: { get: (id) => id === "runyth-scene-lightkeeper" ? moduleRecord : null },
  settings: {
    register: (module, key, config) => registered.push({ module, key, config }),
    registerMenu: (module, key, config) => menus.push({ module, key, config }),
    get: (_module, key) => values.get(key),
    set: async (_module, key, value) => values.set(key, value)
  },
  i18n: { localize: (key) => key, format: (key) => key },
  scenes: { active: null }
};
globalThis.canvas = { scene: null };
globalThis.ui = { controls: { render() {} }, notifications: { info() {}, warn() {}, error() {} } };

await import("../module/scripts/main.mjs");

test("main module registers lifecycle hooks without eager Foundry mutations", () => {
  assert.ok(once.has("init"));
  assert.ok(once.has("ready"));
  assert.ok(on.has("canvasReady"));
  assert.ok(on.has("updateScene"));
  assert.equal(registered.length, 0);
});

test("init registers settings, a valid ApplicationV2 menu, controls, helper, and API", () => {
  once.get("init")();
  assert.equal(registered.length, 22);
  assert.equal(menus.length, 1);
  assert.ok(menus[0].config.type.prototype instanceof MockApplicationV2);
  assert.equal(typeof on.get("getSceneControlButtons"), "function");
  assert.equal(typeof on.get("renderSettings"), "function");
  assert.equal(typeof Handlebars.helpers.slkEq, "function");
  assert.equal(moduleRecord.api.apiVersion, "1.1.8");
  assert.equal(globalThis.SceneLightkeeper, moduleRecord.api);
  assert.equal(typeof moduleRecord.api.openFloating, "function");
  assert.equal(typeof moduleRecord.api.registerTimeSystem, "function");
  assert.equal(typeof moduleRecord.api.requestFogReset, "function");
  const dispose = moduleRecord.api.registerTimeSystem({
    id: "main-init-test",
    label: "Test time",
    modes: ["clock"],
    format: ({ minutes }) => `T${minutes}`
  });
  assert.deepEqual(moduleRecord.api.getTimeSystems().map(({ id }) => id), ["main-init-test"]);
  assert.equal(dispose(), true);
  assert.deepEqual(moduleRecord.api.getTimeSystems(), []);
  assert.equal(emitted.at(-1)?.name, "sceneLightkeeperReady");
});


test("floating-board launcher calls only open or focus and never toggles the board closed", async () => {
  const first = await moduleRecord.api.toggleFloating();
  const second = await moduleRecord.api.toggleFloating();
  assert.equal(first, second);
  assert.equal(first.rendered, true);
  assert.equal(first.closeCalls, 0);
  assert.equal(first.bringToFrontCalls, 1);
});

test("v13 Scene Controls are added once to a record with the required active tool", () => {
  const controls = {};
  on.get("getSceneControlButtons")(controls);
  on.get("getSceneControlButtons")(controls);
  assert.deepEqual(Object.keys(controls), ["runyth-scene-lightkeeper"]);
  const control = controls["runyth-scene-lightkeeper"];
  assert.equal(control.activeTool, "openPanel");
  assert.equal(control.tools.openPanel.button, true);
  assert.equal(control.tools.resetFog.button, true);
  assert.equal(typeof control.tools.bright.onChange, "function");
});

test("ready completes without auto-opening or first-run dialog when disabled", async () => {
  once.get("ready")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(values.get("lastSeenVersion"), undefined);
});

test("setting-triggered Scene Controls refresh contains synchronous render failures", async () => {
  const setting = registered.find(({ key }) => key === "showSceneControl");
  assert.equal(typeof setting.config.onChange, "function");
  const previousRender = ui.controls.render;
  const previousWarn = console.warn;
  let warning = "";
  ui.controls.render = () => { throw new Error("expected controls render failure"); };
  console.warn = (...values) => { warning = values.map(String).join(" "); };
  try {
    setting.config.onChange();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    ui.controls.render = previousRender;
    console.warn = previousWarn;
  }
  assert.match(warning, /Could not refresh Scene Controls/);
});
