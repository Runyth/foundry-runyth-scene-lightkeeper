// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

class MockApplicationV2 {
  constructor(options = {}) {
    this.options = options;
    this.position = options.position ?? {};
    this.rendered = false;
    this.element = null;
  }
  async _prepareContext() { return {}; }
  _onRender() {}
  _onPosition(position) { this.position = position; }
  _onClose() {}
  async render() { this.rendered = true; return this; }
  async close() { this.rendered = false; this._onClose({}); return this; }
}
class MockDialogV2 {
  static async confirm() { return false; }
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
  settings: { get: () => ({}), set: async () => ({}) },
  i18n: { localize: (key) => key, format: (key) => key },
  scenes: { active: null }
};
globalThis.canvas = { scene: null };
globalThis.ui = { notifications: { error: () => {}, info: () => {} } };

const { ControlPanel } = await import("../module/scripts/applications/control-panel.mjs");
const { FloatingBoard } = await import("../module/scripts/applications/floating-board.mjs");
const { SettingsHub } = await import("../module/scripts/applications/settings-hub.mjs");

test("all three interfaces load as ApplicationV2 subclasses", () => {
  assert.ok(new ControlPanel() instanceof MockApplicationV2);
  assert.ok(new FloatingBoard() instanceof MockApplicationV2);
  assert.ok(new SettingsHub() instanceof MockApplicationV2);
});

test("primary windows declare stable IDs, templates, and responsive geometry", () => {
  assert.equal(ControlPanel.DEFAULT_OPTIONS.id, "runyth-scene-lightkeeper-control-panel");
  assert.equal(FloatingBoard.DEFAULT_OPTIONS.id, "runyth-scene-lightkeeper-floating-board");
  assert.equal(SettingsHub.DEFAULT_OPTIONS.id, "runyth-scene-lightkeeper-settings-hub");
  assert.match(ControlPanel.PARTS.main.template, /control-panel\.hbs$/);
  assert.match(FloatingBoard.PARTS.main.template, /floating-board\.hbs$/);
  assert.equal(ControlPanel.DEFAULT_OPTIONS.window.resizable, true);
  assert.equal(FloatingBoard.DEFAULT_OPTIONS.window.minimizable, false);
});

test("ApplicationV2 action maps use module-specific actions", () => {
  for (const actions of [ControlPanel.DEFAULT_OPTIONS.actions, FloatingBoard.DEFAULT_OPTIONS.actions, SettingsHub.DEFAULT_OPTIONS.actions]) {
    assert.ok(!Object.hasOwn(actions, "tab"));
    for (const handler of Object.values(actions)) assert.equal(typeof handler, "function");
  }
});

test("native close hooks do not block window closure on asynchronous setting writes", () => {
  const panel = new ControlPanel();
  assert.doesNotThrow(() => panel._onClose({}));
  const floating = new FloatingBoard();
  assert.doesNotThrow(() => floating._onClose({}));
  const settings = new SettingsHub();
  assert.doesNotThrow(() => settings._onClose({}));
});
