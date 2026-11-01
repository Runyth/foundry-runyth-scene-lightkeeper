// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settingValues = new Map([
  ["panelState", {}],
  ["floatingState", {}],
  ["settingsHubState", {}],
  ["livePreview", false],
  ["modeSwitchBehavior", "apply"],
  ["controlChangeBehavior", "immediate"],
  ["seasonalEnabled", true],
  ["deriveSeasonFromImperialMonth", false],
  ["defaultSeason", "spring"],
  ["defaultSeasonMode", "manual"],
  ["defaultLightMode", "automatic"],
  ["defaultNaturalLightCutoff", 72],
  ["confirmFogReset", false],
  ["showSceneControl", true],
  ["floatingEnabled", true],
  ["sceneSyncMode", "off"],
  ["currentLightingSnapshot", {}]
]);

const sceneUpdates = [];
const notifications = [];
let fogResetCount = 0;
let storedState = {};

function setPath(object, path, value) {
  const parts = path.split(".");
  let cursor = object;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = value;
}

const scene = {
  id: "scene-a",
  name: "Action Test Scene",
  tokenVision: false,
  fog: { exploration: false },
  environment: {
    darknessLevel: 0,
    darknessLevelLock: false,
    globalLight: { enabled: 1, darkness: { min: 0, max: 0.72 } }
  },
  getFlag(module, key) {
    return module === "runyth-scene-lightkeeper" && key === "state" ? structuredClone(storedState) : undefined;
  },
  canUserModify() { return true; },
  async update(changes, options = {}) {
    sceneUpdates.push({ changes: structuredClone(changes), options: structuredClone(options) });
    for (const [path, value] of Object.entries(changes)) {
      if (path === "flags.runyth-scene-lightkeeper.state") storedState = structuredClone(value);
      else setPath(this, path, value);
    }
    return this;
  }
};

class MockApplicationV2 {
  constructor(options = {}) {
    this.options = options;
    this.position = options.position ?? {};
    this.rendered = false;
    this.element = null;
    this.renderCalls = [];
    this.closeCalls = 0;
  }
  async _prepareContext() { return {}; }
  _onRender() {}
  _onPosition(position) { this.position = position; }
  _onClose() {}
  setPosition(position) { this.position = position; return this.position; }
  async render(options = {}) { this.rendered = true; this.renderCalls.push(options); return this; }
  async close() { this.rendered = false; this.closeCalls += 1; this._onClose({}); return this; }
}

class MockDialogV2 {
  static result = true;
  static calls = [];
  static async confirm(options) {
    this.calls.push(options);
    return this.result;
  }
  static async wait(options) {
    this.calls.push(options);
    return "close";
  }
}

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
globalThis.game = {
  user: { id: "gm", isGM: true },
  modules: { get: () => ({ version: "1.1.3" }) },
  settings: {
    get: (_module, key) => settingValues.get(key),
    set: async (_module, key, value) => settingValues.set(key, structuredClone(value))
  },
  i18n: {
    localize: (key) => key,
    format: (key, data) => `${key}:${JSON.stringify(data)}`
  },
  scenes: { active: scene }
};
globalThis.canvas = {
  scene,
  environment: { animateDarkness: () => undefined },
  fog: { async reset() { fogResetCount += 1; } }
};
globalThis.ui = {
  notifications: {
    error: (message) => notifications.push({ type: "error", message }),
    info: (message) => notifications.push({ type: "info", message })
  }
};

const apiCalls = { open: 0, openSettings: 0, toggleFloating: 0, resetLayout: 0 };
globalThis.SceneLightkeeper = {
  open: async () => { apiCalls.open += 1; },
  openSettings: async () => { apiCalls.openSettings += 1; },
  toggleFloating: async () => { apiCalls.toggleFloating += 1; },
  resetLayout: async () => { apiCalls.resetLayout += 1; }
};

const { ControlPanel } = await import("../module/scripts/applications/control-panel.mjs");
const { FloatingBoard } = await import("../module/scripts/applications/floating-board.mjs");
const { SettingsHub } = await import("../module/scripts/applications/settings-hub.mjs");
const { registerSceneControls } = await import("../module/scripts/ui/scene-controls.mjs");

function eventCounter() {
  const event = { count: 0, preventDefault() { this.count += 1; } };
  return event;
}

async function invokeAction(app, handler, target = { dataset: {} }) {
  const event = eventCounter();
  const result = handler.call(app, event, target);
  assert.equal(typeof result?.then, "function", "ApplicationV2 actions must return a contained Promise");
  await result;
  assert.equal(event.count, 1, "ApplicationV2 actions must prevent native button behavior once");
}

test("every template data-action is mapped and every mapped action is rendered", () => {
  const pairs = [
    [ControlPanel, "module/templates/control-panel.hbs"],
    [FloatingBoard, "module/templates/floating-board.hbs"],
    [SettingsHub, "module/templates/settings-hub.hbs"]
  ];
  for (const [ApplicationClass, templatePath] of pairs) {
    const template = readFileSync(templatePath, "utf8");
    const templateActions = new Set([...template.matchAll(/data-action="([^"]+)"/g)].map((match) => match[1]));
    const mappedActions = new Set(Object.keys(ApplicationClass.DEFAULT_OPTIONS.actions));
    assert.deepEqual([...templateActions].sort(), [...mappedActions].sort(), `${templatePath} action parity`);
  }
});

test("all ControlPanel buttons execute with Foundry ApplicationV2 instance binding", async () => {
  const panel = new ControlPanel();
  panel.rendered = true;
  const actions = ControlPanel.DEFAULT_OPTIONS.actions;

  const updatesBeforePreview = sceneUpdates.length;
  await invokeAction(panel, actions.switchMode, { dataset: { mode: "clock" } });
  assert.equal(storedState.mode, undefined, "mode tab preview must not mutate the scene by default");
  assert.equal(sceneUpdates.length, updatesBeforePreview);
  assert.equal(panel._viewMode, "clock");

  await invokeAction(panel, actions.applyScheme);
  assert.equal(storedState.mode, "clock");

  await invokeAction(panel, actions.switchMode, { dataset: { mode: "phase" } });
  await invokeAction(panel, actions.discardChanges);
  assert.equal(storedState.mode, "clock");

  await invokeAction(panel, actions.applyPreset, { dataset: { feel: "22" } });
  assert.equal(storedState.mode, "feel");
  assert.equal(storedState.feel, 22);

  await invokeAction(panel, actions.toggleFog);
  assert.equal(scene.fog.exploration, true);

  await invokeAction(panel, actions.toggleVision);
  assert.equal(scene.tokenVision, true);

  await invokeAction(panel, actions.toggleLock);
  assert.equal(scene.environment.darknessLevelLock, true);

  await invokeAction(panel, actions.resetFog);
  assert.equal(fogResetCount, 1);

  await invokeAction(panel, actions.openGuide);
  await invokeAction(panel, actions.openSettings);
  await invokeAction(panel, actions.toggleFloating);
  assert.equal(apiCalls.openSettings, 1);
  assert.equal(apiCalls.toggleFloating, 1);
  assert.ok(panel.renderCalls.length >= 6);
  assert.equal(notifications.filter(({ type }) => type === "error").length, 0);
  assert.ok(sceneUpdates.length >= 5);
});

test("floating-board and settings-hub buttons execute with instance binding", async () => {
  const board = new FloatingBoard();
  await invokeAction(board, FloatingBoard.DEFAULT_OPTIONS.actions.openGuide);
  await invokeAction(board, FloatingBoard.DEFAULT_OPTIONS.actions.openPanel);

  const hub = new SettingsHub();
  await invokeAction(hub, SettingsHub.DEFAULT_OPTIONS.actions.openGuide);
  await invokeAction(hub, SettingsHub.DEFAULT_OPTIONS.actions.openPanel);
  await invokeAction(hub, SettingsHub.DEFAULT_OPTIONS.actions.toggleFloating);
  await invokeAction(hub, SettingsHub.DEFAULT_OPTIONS.actions.resetLayout);

  assert.equal(apiCalls.open, 2);
  assert.equal(apiCalls.toggleFloating, 2);
  assert.equal(apiCalls.resetLayout, 1);
});

test("UI action failures are contained and reported without unhandled rejection", async () => {
  const panel = new ControlPanel();
  const previous = globalThis.SceneLightkeeper.openSettings;
  const previousConsoleError = console.error;
  globalThis.SceneLightkeeper.openSettings = async () => { throw new Error("expected action failure"); };
  console.error = () => {};
  try {
    await invokeAction(panel, ControlPanel.DEFAULT_OPTIONS.actions.openSettings);
  } finally {
    globalThis.SceneLightkeeper.openSettings = previous;
    console.error = previousConsoleError;
  }
  assert.equal(notifications.at(-1)?.type, "error");
  assert.equal(notifications.at(-1)?.message, "expected action failure");
});

test("live preview tolerates synchronous returns and synchronous animation failures", async () => {
  settingValues.set("livePreview", true);
  const panel = new ControlPanel();
  const target = { dataset: { slkField: "feel" }, type: "range", value: "35" };
  canvas.environment.animateDarkness = () => undefined;
  assert.doesNotThrow(() => panel.onInput({ currentTarget: target }));
  await new Promise((resolve) => setImmediate(resolve));
  canvas.environment.animateDarkness = () => { throw new Error("expected preview failure"); };
  assert.doesNotThrow(() => panel.onInput({ currentTarget: target }));
  await new Promise((resolve) => setImmediate(resolve));
  settingValues.set("livePreview", false);
});

test("Scene Controls callbacks execute and malformed array controls are ignored", async () => {
  const malformed = [];
  registerSceneControls(malformed);
  assert.equal(Object.hasOwn(malformed, "runyth-scene-lightkeeper"), false);

  const controls = {};
  registerSceneControls(controls);
  const tools = controls["runyth-scene-lightkeeper"].tools;
  for (const tool of Object.values(tools)) {
    const result = tool.onChange();
    if (result?.then) await result;
  }
  assert.equal(apiCalls.open, 3);
  assert.equal(apiCalls.toggleFloating, 3);
  assert.equal(notifications.filter(({ type }) => type === "error").length, 1, "only the intentional failure is reported");
});

test("ControlPanel field conversion preserves types and nested Imperial dates", () => {
  const panel = new ControlPanel();
  assert.deepEqual(panel.patchFromInput({ dataset: { slkField: "feel" }, type: "range", value: "41" }), {
    feel: 41,
    mode: "feel"
  });
  assert.deepEqual(panel.patchFromInput({ dataset: { slkField: "clockMinutes" }, type: "range", value: "945" }), {
    clockMinutes: 945,
    mode: "clock"
  });
  assert.deepEqual(panel.patchFromInput({ dataset: { slkField: "ordinaryMonth" }, type: "number", value: "11" }), {
    ordinaryDate: { month: 11 }
  });
  assert.deepEqual(panel.patchFromInput({ dataset: { slkField: "imperialMonth" }, type: "number", value: "17" }), {
    imperialDate: { month: 17 }
  });
  assert.deepEqual(panel.patchFromInput({ dataset: { slkField: "season" }, type: "select-one", value: "winter" }), {
    season: "winter"
  });
});

test("ControlPanel change events and floating quick controls reach the Scene service", async () => {
  const panel = new ControlPanel();
  panel.rendered = true;
  await panel.onChange({
    currentTarget: { dataset: { slkField: "imperialBell" }, type: "range", value: "29" }
  });
  assert.equal(storedState.mode, "imperial");
  assert.equal(storedState.imperialBell, 29);
  assert.equal(panel._applying, false);

  const board = new FloatingBoard();
  board.rendered = true;
  await board.applyInput({ dataset: { slkQuick: "phase" }, value: "73" });
  assert.equal(storedState.mode, "phase");
  assert.equal(storedState.phase, 73);
  assert.equal(board._busy, false);

  await board.applyInput({ dataset: { slkQuick: "season" }, value: "summer" });
  assert.equal(storedState.season, "summer");
});

test("render hooks wire both input and change listeners to every interactive control", () => {
  function instrumentedElement(count) {
    const listeners = Array.from({ length: count }, () => []);
    const inputs = listeners.map((registered) => ({
      addEventListener(name) { registered.push(name); }
    }));
    return {
      listeners,
      querySelectorAll: () => inputs,
      querySelector: () => null
    };
  }

  const panel = new ControlPanel();
  panel.element = instrumentedElement(3);
  panel._onRender({}, {});
  for (const listeners of panel.element.listeners) assert.deepEqual(listeners.sort(), ["change", "input"]);

  const board = new FloatingBoard();
  board.element = instrumentedElement(2);
  board._onRender({}, {});
  for (const listeners of board.element.listeners) assert.deepEqual(listeners.sort(), ["change", "input"]);
});

test("Scene Control entry-point failures use the same contained error boundary", async () => {
  const controls = {};
  registerSceneControls(controls);
  const previous = globalThis.SceneLightkeeper.open;
  const previousConsoleError = console.error;
  globalThis.SceneLightkeeper.open = async () => { throw new Error("expected toolbar failure"); };
  console.error = () => {};
  try {
    await controls["runyth-scene-lightkeeper"].tools.openPanel.onChange();
  } finally {
    globalThis.SceneLightkeeper.open = previous;
    console.error = previousConsoleError;
  }
  assert.equal(notifications.at(-1)?.message, "expected toolbar failure");
});


test("mode buttons can restore legacy immediate application", async () => {
  settingValues.set("modeSwitchBehavior", "immediate");
  const panel = new ControlPanel();
  panel.rendered = true;
  await invokeAction(panel, ControlPanel.DEFAULT_OPTIONS.actions.switchMode, { dataset: { mode: "clock" } });
  assert.equal(storedState.mode, "clock");
  settingValues.set("modeSwitchBehavior", "apply");
});

test("global staged-control mode waits for Apply while presets stay immediate", async () => {
  settingValues.set("controlChangeBehavior", "apply");
  const panel = new ControlPanel();
  panel.rendered = true;
  const before = sceneUpdates.length;
  const target = { dataset: { slkField: "phase" }, type: "range", value: "64" };
  panel.onInput({ currentTarget: target });
  await panel.onChange({ currentTarget: target });
  assert.equal(sceneUpdates.length, before, "staged slider must not update the Scene");
  assert.equal(panel._draftPatch.phase, 64);
  await invokeAction(panel, ControlPanel.DEFAULT_OPTIONS.actions.applyScheme);
  assert.equal(storedState.mode, "phase");
  assert.equal(storedState.phase, 64);

  const beforePreset = sceneUpdates.length;
  await invokeAction(panel, ControlPanel.DEFAULT_OPTIONS.actions.applyPreset, { dataset: { feel: "0" } });
  assert.equal(sceneUpdates.length, beforePreset + 1, "feel presets remain immediate");
  assert.equal(storedState.mode, "feel");
  settingValues.set("controlChangeBehavior", "immediate");
});

test("fog reset cancellation prevents destructive execution", async () => {
  settingValues.set("confirmFogReset", true);
  MockDialogV2.result = false;
  const panel = new ControlPanel();
  const before = fogResetCount;
  await invokeAction(panel, ControlPanel.DEFAULT_OPTIONS.actions.resetFog);
  assert.equal(fogResetCount, before);
  MockDialogV2.result = true;
  settingValues.set("confirmFogReset", false);
});

test("immediate side controls preserve a mode tab being inspected without applying it", async () => {
  settingValues.set("modeSwitchBehavior", "apply");
  settingValues.set("controlChangeBehavior", "immediate");
  storedState = { ...storedState, mode: "feel", feel: 25, season: "spring" };
  const panel = new ControlPanel();
  panel.rendered = true;

  await invokeAction(panel, ControlPanel.DEFAULT_OPTIONS.actions.switchMode, { dataset: { mode: "clock" } });
  assert.equal(panel._viewMode, "clock");
  await panel.onChange({
    currentTarget: { dataset: { slkField: "season" }, type: "select-one", value: "winter" }
  });

  assert.equal(storedState.mode, "feel", "changing a side control must not apply the inspected mode");
  assert.equal(storedState.season, "winter");
  assert.equal(panel._viewMode, "clock", "the inspected tab should remain visible after an immediate side-control update");
});
