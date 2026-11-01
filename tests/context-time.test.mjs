// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test, { after } from "node:test";
import assert from "node:assert/strict";

const settingValues = new Map([
  ["defaultSeason", "spring"],
  ["defaultSeasonMode", "manual"],
  ["deriveSeasonFromImperialMonth", false],
  ["defaultLightMode", "automatic"],
  ["defaultNaturalLightCutoff", 72],
  ["seasonalEnabled", true],
  ["sceneSyncMode", "off"],
  ["modeSwitchBehavior", "apply"],
  ["controlChangeBehavior", "immediate"]
]);

const storedState = {
  mode: "clock",
  feel: 10,
  phase: 40,
  clockMinutes: 390,
  imperialBell: 18,
  moonIndex: 2,
  season: "spring",
  seasonMode: "calendar",
  ordinaryDate: { year: 2026, month: 1, day: 9 },
  imperialDate: { year: 443, month: 17, day: 23 },
  lightMode: "automatic",
  naturalLightCutoff: 72,
  transitionSeconds: 0
};

const scene = {
  id: "context-scene",
  name: "Context Scene",
  fog: { exploration: true },
  tokenVision: true,
  environment: {
    darknessLevelLock: false,
    globalLight: { enabled: 1, darkness: { min: 0, max: 0.72 } }
  },
  getFlag: () => structuredClone(storedState),
  canUserModify: () => true
};

globalThis.foundry = { utils: { deepClone: structuredClone } };
globalThis.game = {
  user: { id: "gm", isGM: true },
  settings: { get: (_module, key) => settingValues.get(key) },
  i18n: {
    localize: (key) => key,
    format: (key, data) => `${key}:${JSON.stringify(data)}`
  },
  scenes: { active: scene }
};
globalThis.canvas = { scene };

const { buildSceneContext } = await import("../module/scripts/ui/context.mjs");
const { clearTimeSystemsForTests, registerTimeSystem } = await import("../module/scripts/time-systems.mjs");

after(() => clearTimeSystemsForTests());

test("course-of-day context exposes ordinary, Imperial, and complementary approximate times", () => {
  registerTimeSystem({
    id: "custom-phase",
    label: "Custom",
    modes: ["phase"],
    format: ({ minutes, approximate }) => `${approximate ? "about " : ""}${minutes}`
  });

  const context = buildSceneContext({ modeOverride: "phase" });
  assert.match(context.phaseClockLabel, /^\d{2}:\d{2}$/);
  assert.match(context.phaseImperialLabel, /^SLK\.Imperial\.CompactTime:/);
  assert.equal(context.phaseTimeSystems.length, 1);
  assert.equal(context.phaseTimeSystems[0].id, "custom-phase");
  assert.equal(context.phaseTimeSystems[0].label, "Custom");
  assert.match(context.phaseTimeSystems[0].value, /^about \d+$/);
  assert.equal(context.calendarSeasonApplicable, false);
  assert.equal(context.seasonModes.find(({ value }) => value === "calendar").disabled, true);
});

test("24-hour context retains ordinary date and derives season from its month", () => {
  const context = buildSceneContext({ modeOverride: "clock" });
  assert.deepEqual(context.state.ordinaryDate, storedState.ordinaryDate);
  assert.equal(context.effectiveSeasonLabel, "SLK.Season.Winter");
  assert.match(context.clockImperialLabel, /^SLK\.Imperial\.CompactTime:/);
  assert.equal(context.calendarSeasonApplicable, true);
  assert.equal(context.seasonModes.find(({ value }) => value === "calendar").disabled, false);
});

test("Imperial context derives season from its 33-month date and exposes ordinary equivalent", () => {
  const context = buildSceneContext({ modeOverride: "imperial" });
  assert.deepEqual(context.state.imperialDate, storedState.imperialDate);
  assert.equal(context.effectiveSeasonLabel, "SLK.Season.Summer");
  assert.match(context.imperialClockLabel, /^\d{2}:\d{2}$/);
  assert.equal(context.umgang, 3);
  assert.equal(context.dayInUmgang, 1);
});
