// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settings = new Map([
  ["floatingState", {}],
  ["controlChangeBehavior", "immediate"],
  ["livePreview", false],
  ["seasonalEnabled", true],
  ["defaultSeason", "spring"],
  ["defaultSeasonMode", "manual"],
  ["defaultLightMode", "automatic"],
  ["defaultNaturalLightCutoff", 72],
  ["sceneSyncMode", "off"]
]);

class MockApplicationV2 {
  constructor(options = {}) {
    this.options = options;
    this.position = options.position ?? {};
    this.rendered = false;
    this.baseCloseCalls = 0;
    this.bringToFrontCalls = 0;
    this.renderCalls = 0;
    this.element = null;
    this.window = null;
  }
  async _prepareContext() { return {}; }
  _onRender() {}
  _onPosition() {}
  _onClose() {}
  setPosition(position) { this.position = position; return position; }
  bringToFront() { this.bringToFrontCalls += 1; }
  async render() { this.rendered = true; this.renderCalls += 1; return this; }
  async close(options = {}) {
    this.baseCloseCalls += 1;
    this.rendered = false;
    this._onClose(options);
    return this;
  }
}

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: MockApplicationV2,
      HandlebarsApplicationMixin: (Base) => class extends Base {}
    }
  },
  utils: { deepClone: structuredClone }
};
globalThis.game = {
  ready: true,
  user: { id: "gm", isGM: true },
  settings: {
    get: (_module, key) => settings.get(key),
    set: async (_module, key, value) => settings.set(key, structuredClone(value))
  },
  i18n: { localize: (key) => key },
  scenes: { active: null }
};
globalThis.canvas = { scene: null };
const documentListeners = new Map();
const windowListeners = new Map();
globalThis.document = {
  body: {},
  visibilityState: "visible",
  getElementById: () => null,
  addEventListener: (name, callback) => documentListeners.set(name, callback),
  removeEventListener: (name, callback) => { if (documentListeners.get(name) === callback) documentListeners.delete(name); }
};
globalThis.window = {
  addEventListener: (name, callback) => windowListeners.set(name, callback),
  removeEventListener: (name, callback) => { if (windowListeners.get(name) === callback) windowListeners.delete(name); }
};
globalThis.ui = { notifications: { error() {} } };

const { FloatingBoard } = await import("../module/scripts/applications/floating-board.mjs");

function actionEvent() {
  return { prevented: 0, preventDefault() { this.prevented += 1; } };
}

test("floating board rejects generic close paths and only its explicit X action closes it", async () => {
  const board = new FloatingBoard();
  await board.render({ force: true });

  await board.close({ reason: "escape" });
  assert.equal(board.rendered, true);
  assert.equal(board.baseCloseCalls, 0);
  assert.equal(board.bringToFrontCalls, 1);

  await board.close({ reason: "another-application-opened" });
  assert.equal(board.rendered, true);
  assert.equal(board.baseCloseCalls, 0);
  assert.equal(board.bringToFrontCalls, 2);

  await board.close({ sceneLightkeeperExplicitClose: true });
  assert.equal(board.rendered, true, "external options cannot spoof the board-owned X action");
  assert.equal(board.baseCloseCalls, 0);
  assert.equal(board.bringToFrontCalls, 3);

  const event = actionEvent();
  await FloatingBoard.DEFAULT_OPTIONS.actions.closeBoard.call(board, event, { dataset: {} });
  assert.equal(event.prevented, 1);
  assert.equal(board.rendered, false);
  assert.equal(board.baseCloseCalls, 1);
  assert.equal(board._stickyDesired, false);
});


test("floating board restores itself if an external teardown bypasses its public close guard", async () => {
  const board = new FloatingBoard();
  board._stickyDesired = true;
  board.rendered = false;
  const before = board.renderCalls;
  board._onClose({ reason: "external-teardown" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(board.rendered, true);
  assert.equal(board.renderCalls, before + 1);
});

test("floating board removes minimization and hides the generic native close control", () => {
  const board = new FloatingBoard();
  const nativeClose = {
    hidden: false,
    tabIndex: 0,
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); }
  };
  board.window = { close: nativeClose };
  board.element = { querySelectorAll: () => [] };
  board._onRender({}, {});

  assert.equal(FloatingBoard.DEFAULT_OPTIONS.window.minimizable, false);
  assert.equal(nativeClose.hidden, true);
  assert.equal(nativeClose.tabIndex, -1);
  assert.equal(nativeClose.attributes.get("aria-hidden"), "true");
  board.stopStickyGuard();
});

test("mini-dashboard explains why Apply is absent by default and exposes it in staged mode", () => {
  const template = readFileSync("module/templates/floating-board.hbs", "utf8");
  assert.match(template, /controlBehaviorLabel/);
  const source = readFileSync("module/scripts/applications/floating-board.mjs", "utf8");
  assert.match(source, /SLK\.Floating\.ImmediateBehavior/);
  assert.match(source, /SLK\.Floating\.StagedBehavior/);
  assert.match(template, /#if showApplyControls[\s\S]*data-action="applyChanges"/);
  assert.match(template, /data-action="closeBoard"/);
});


test("floating board restores on visibility return and Foundry window focus", async () => {
  const board = new FloatingBoard();
  board._stickyDesired = true;
  board.rendered = false;
  board.element = { isConnected: false };
  board.startStickyGuard();

  assert.equal(typeof documentListeners.get("visibilitychange"), "function");
  assert.equal(typeof windowListeners.get("focus"), "function");

  document.visibilityState = "hidden";
  documentListeners.get("visibilitychange")();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(board.renderCalls, 0);

  document.visibilityState = "visible";
  documentListeners.get("visibilitychange")();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(board.renderCalls, 1);

  board.rendered = false;
  windowListeners.get("focus")();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(board.renderCalls, 2);

  board.stopStickyGuard();
  assert.equal(documentListeners.has("visibilitychange"), false);
  assert.equal(windowListeners.has("focus"), false);
});
