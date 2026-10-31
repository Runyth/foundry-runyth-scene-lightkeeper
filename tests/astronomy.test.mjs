// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import {
  darknessForClock,
  darknessForFeel,
  formatClock,
  imperialBellToMinutes,
  imperialUmgangForDay,
  imperialWatchForBell,
  minutesToImperialBell,
  phaseToMinutes,
  seasonForImperialMonth,
  seasonForOrdinaryMonth
} from "../module/scripts/astronomy.mjs";

test("perceived darkness is a direct understandable 0-100 mapping", () => {
  assert.equal(darknessForFeel(0), 0);
  assert.equal(darknessForFeel(50), 0.5);
  assert.equal(darknessForFeel(100), 1);
});

test("summer mornings are brighter than winter mornings", () => {
  const summer = darknessForClock(360, { season: "summer", moonIndex: 0 });
  const winter = darknessForClock(360, { season: "winter", moonIndex: 0 });
  assert.ok(summer < winter, `${summer} should be below ${winter}`);
});

test("moonlight reduces darkness only at night", () => {
  assert.ok(darknessForClock(60, { season: "spring", moonIndex: 4 }) < darknessForClock(60, { season: "spring", moonIndex: 0 }));
  assert.equal(darknessForClock(720, { season: "spring", moonIndex: 4 }), darknessForClock(720, { season: "spring", moonIndex: 0 }));
});

test("day phase runs from sunrise through sunset into night", () => {
  const start = phaseToMinutes(0, "spring");
  const middle = phaseToMinutes(55, "spring");
  const end = phaseToMinutes(100, "spring");
  assert.ok(start < middle && middle < end);
});

test("ordinary clock formatting and Imperial conversion are bounded", () => {
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(1439), "23:59");
  for (const bell of [1, 11, 12, 22, 23, 33]) assert.equal(minutesToImperialBell(imperialBellToMinutes(bell)), bell);
});

test("Imperial watches contain eleven Glocken each", () => {
  assert.deepEqual([1, 11].map(imperialWatchForBell).map((v) => [v.id, v.bellInWatch]), [["night", 1], ["night", 11]]);
  assert.deepEqual([12, 22].map(imperialWatchForBell).map((v) => [v.id, v.bellInWatch]), [["crown", 1], ["crown", 11]]);
  assert.deepEqual([23, 33].map(imperialWatchForBell).map((v) => [v.id, v.bellInWatch]), [["lantern", 1], ["lantern", 11]]);
});

test("Imperial days map to three Umgänge of eleven days", () => {
  assert.deepEqual(imperialUmgangForDay(1), { umgang: 1, dayInUmgang: 1 });
  assert.deepEqual(imperialUmgangForDay(11), { umgang: 1, dayInUmgang: 11 });
  assert.deepEqual(imperialUmgangForDay(12), { umgang: 2, dayInUmgang: 1 });
  assert.deepEqual(imperialUmgangForDay(23), { umgang: 3, dayInUmgang: 1 });
  assert.deepEqual(imperialUmgangForDay(33), { umgang: 3, dayInUmgang: 11 });
});

test("33 Imperial months map deterministically to seasons", () => {
  assert.equal(seasonForImperialMonth(1), "winter");
  assert.equal(seasonForImperialMonth(9), "spring");
  assert.equal(seasonForImperialMonth(17), "summer");
  assert.equal(seasonForImperialMonth(25), "autumn");
  assert.equal(seasonForImperialMonth(33), "autumn");
});


test("12 ordinary months map deterministically to seasons", () => {
  assert.equal(seasonForOrdinaryMonth(1), "winter");
  assert.equal(seasonForOrdinaryMonth(3), "spring");
  assert.equal(seasonForOrdinaryMonth(6), "summer");
  assert.equal(seasonForOrdinaryMonth(9), "autumn");
  assert.equal(seasonForOrdinaryMonth(12), "winter");
});
