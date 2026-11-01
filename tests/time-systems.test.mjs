// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearTimeSystemsForTests,
  getTimeSystemDisplays,
  listTimeSystems,
  registerTimeSystem,
  unregisterTimeSystem
} from "../module/scripts/time-systems.mjs";

const localize = (key) => `localized:${key}`;

afterEach(() => clearTimeSystemsForTests());

test("complementary time systems register, sort, filter by mode, and unregister", () => {
  const disposeLater = registerTimeSystem({
    id: "later",
    label: "Later calendar",
    modes: ["clock"],
    order: 20,
    format: ({ minutes }) => `L${minutes}`
  });
  registerTimeSystem({
    id: "first",
    labelKey: "Example.TimeSystem",
    modes: ["phase", "imperial", "phase", "feel"],
    order: 10,
    format: ({ mode }) => mode
  });

  assert.deepEqual(listTimeSystems().map(({ id }) => id), ["first", "later"]);
  assert.deepEqual(listTimeSystems()[0].modes, ["phase", "imperial"]);
  assert.deepEqual(getTimeSystemDisplays({ minutes: 300, mode: "clock", localize }), [
    { id: "later", label: "Later calendar", value: "L300" }
  ]);
  assert.deepEqual(getTimeSystemDisplays({ minutes: 300, mode: "phase", localize }), [
    { id: "first", label: "localized:Example.TimeSystem", value: "phase" }
  ]);
  assert.equal(disposeLater(), true);
  assert.equal(unregisterTimeSystem("first"), true);
  assert.deepEqual(listTimeSystems(), []);
});

test("formatters receive full display context including approximate mode", () => {
  const state = { clockMinutes: 615 };
  const scene = { id: "scene-1" };
  let received;
  registerTimeSystem({
    id: "context",
    label: ({ localize: translate }) => translate("Example.Context"),
    format: (context) => {
      received = context;
      return "custom time";
    }
  });

  const displays = getTimeSystemDisplays({
    minutes: 615,
    mode: "phase",
    state,
    scene,
    approximate: true,
    localize
  });

  assert.equal(displays[0].label, "localized:Example.Context");
  assert.equal(displays[0].value, "custom time");
  assert.deepEqual(received, {
    minutes: 615,
    mode: "phase",
    state,
    scene,
    approximate: true,
    localize
  });
});

test("duplicate and malformed time-system definitions are rejected", () => {
  assert.throws(() => registerTimeSystem(), /definition is required/);
  assert.throws(() => registerTimeSystem({ id: "bad id", label: "Bad", format() {} }), /id must use/);
  assert.throws(() => registerTimeSystem({ id: "missing-label", format() {} }), /requires label or labelKey/);
  assert.throws(() => registerTimeSystem({ id: "missing-format", label: "Missing" }), /synchronous format function/);

  registerTimeSystem({ id: "duplicate", label: "First", format: () => "1" });
  assert.throws(
    () => registerTimeSystem({ id: "duplicate", label: "Second", format: () => "2" }),
    /already registered/
  );
});

test("broken, empty, and asynchronous formatters are contained without poisoning other systems", () => {
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (...values) => warnings.push(values.map(String).join(" "));
  try {
    registerTimeSystem({ id: "throws", label: "Throws", order: 1, format: () => { throw new Error("expected"); } });
    registerTimeSystem({ id: "async", label: "Async", order: 2, format: async () => "late" });
    registerTimeSystem({ id: "empty", label: "Empty", order: 3, format: () => "" });
    registerTimeSystem({ id: "valid", label: "Valid", order: 4, format: () => "shown" });

    assert.deepEqual(getTimeSystemDisplays({ minutes: 0, mode: "clock", localize }), [
      { id: "valid", label: "Valid", value: "shown" }
    ]);
  } finally {
    console.warn = previousWarn;
  }
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /throws/);
  assert.match(warnings[1], /async/);
});
