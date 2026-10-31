// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { clearWindowStates, loadWindowState, saveWindowState } from "../module/scripts/ui/window-state.mjs";

test("restored windows are clamped to the current viewport", () => {
  globalThis.innerWidth = 900;
  globalThis.innerHeight = 700;
  globalThis.game = { settings: { get: () => ({ width: 5000, height: 5000, left: 8000, top: -50 }) } };
  const state = loadWindowState("panelState");
  assert.equal(state.width, 876);
  assert.equal(state.height, 676);
  assert.equal(state.left, 820);
  assert.equal(state.top, 0);
});

test("only finite integer geometry is persisted", async () => {
  const writes = [];
  globalThis.game = { settings: { set: async (...args) => writes.push(args) } };
  await saveWindowState("panelState", { width: 640.7, height: 500.2, left: Number.NaN, top: 20.9 });
  assert.deepEqual(writes[0], ["runyth-scene-lightkeeper", "panelState", { width: 641, height: 500, top: 21 }]);
});

test("layout reset clears all client geometry records", async () => {
  const writes = [];
  globalThis.game = { settings: { set: async (...args) => writes.push(args) } };
  await clearWindowStates(["panelState", "floatingState", "settingsHubState"]);
  assert.deepEqual(writes, [
    ["runyth-scene-lightkeeper", "panelState", {}],
    ["runyth-scene-lightkeeper", "floatingState", {}],
    ["runyth-scene-lightkeeper", "settingsHubState", {}]
  ]);
});
