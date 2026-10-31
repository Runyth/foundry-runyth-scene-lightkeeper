// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { MODES, SEASON_MODES } from "../module/scripts/constants.mjs";
import { computeDarkness, effectiveSeason, normalizeState } from "../module/scripts/state.mjs";

test("malformed state is normalized without losing safe defaults", () => {
  const state = normalizeState({
    mode: "broken",
    feel: 140,
    clockMinutes: -20,
    moonIndex: 99,
    season: "monsoon",
    seasonMode: "broken",
    ordinaryDate: { year: -2, month: 99, day: 99 },
    imperialDate: { year: -2, month: 99, day: 99 }
  });
  assert.equal(state.mode, MODES.FEEL);
  assert.equal(state.feel, 100);
  assert.equal(state.clockMinutes, 0);
  assert.equal(state.moonIndex, 4);
  assert.equal(state.season, "spring");
  assert.equal(state.seasonMode, SEASON_MODES.MANUAL);
  assert.deepEqual(state.ordinaryDate, { year: 0, month: 12, day: 31 });
  assert.deepEqual(state.imperialDate, { year: 0, month: 33, day: 33 });
});

test("calendar season uses ordinary months in 24-hour mode", () => {
  const state = normalizeState({
    mode: MODES.CLOCK,
    season: "winter",
    seasonMode: SEASON_MODES.CALENDAR,
    ordinaryDate: { year: 2026, month: 7, day: 4 }
  });
  assert.equal(effectiveSeason(state), "summer");
});

test("calendar season uses the 33-month calendar in Imperial mode", () => {
  const state = normalizeState({
    mode: MODES.IMPERIAL,
    season: "winter",
    seasonMode: SEASON_MODES.CALENDAR,
    imperialDate: { year: 443, month: 20, day: 3 }
  });
  assert.equal(effectiveSeason(state), "summer");
});

test("calendar season remains manual for feeling and course-of-day modes", () => {
  const state = normalizeState({
    mode: MODES.PHASE,
    season: "autumn",
    seasonMode: SEASON_MODES.CALENDAR,
    ordinaryDate: { year: 2026, month: 1, day: 1 }
  });
  assert.equal(effectiveSeason(state), "autumn");
});

test("legacy Imperial derivation option remains supported", () => {
  const state = normalizeState({ mode: MODES.IMPERIAL, season: "winter", imperialDate: { month: 20 } });
  assert.equal(effectiveSeason(state, { deriveSeasonFromImperialMonth: true }), "summer");
});

test("all four modes return a native Foundry darkness value", () => {
  for (const mode of Object.values(MODES)) {
    const value = computeDarkness(normalizeState({ mode, feel: 45, phase: 44, clockMinutes: 1110, imperialBell: 25 }));
    assert.ok(value >= 0 && value <= 1, `${mode} produced ${value}`);
  }
});
