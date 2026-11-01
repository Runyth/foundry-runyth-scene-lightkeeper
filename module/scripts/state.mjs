// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  DEFAULT_STATE,
  MODES,
  MOON_PHASES,
  SEASON_MODES,
  SEASONS,
  STATE_SCHEMA
} from "./constants.mjs";
import {
  clamp,
  darknessForClock,
  darknessForFeel,
  imperialBellToMinutes,
  phaseToMinutes,
  seasonForImperialMonth,
  seasonForOrdinaryMonth
} from "./astronomy.mjs";

function plainClone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

function normalizeDate(input, fallback, maxMonth, maxDay) {
  const date = { ...plainClone(fallback), ...(input ?? {}) };
  date.year = clamp(Math.round(date.year), 0, 9999);
  date.month = clamp(Math.round(date.month), 1, maxMonth);
  date.day = clamp(Math.round(date.day), 1, maxDay);
  return date;
}

export function mergeStatePatch(state, patch = {}) {
  return {
    ...state,
    ...patch,
    ordinaryDate: {
      ...state.ordinaryDate,
      ...(patch.ordinaryDate ?? {})
    },
    imperialDate: {
      ...state.imperialDate,
      ...(patch.imperialDate ?? {})
    }
  };
}

export function normalizeState(input = {}, defaults = {}) {
  const state = {
    ...plainClone(DEFAULT_STATE),
    ...plainClone(defaults),
    ...(input && typeof input === "object" ? plainClone(input) : {})
  };
  state.ordinaryDate = normalizeDate(input?.ordinaryDate, DEFAULT_STATE.ordinaryDate, 12, 31);
  state.imperialDate = normalizeDate(input?.imperialDate, DEFAULT_STATE.imperialDate, 33, 33);
  state.schema = STATE_SCHEMA;
  state.mode = Object.values(MODES).includes(state.mode) ? state.mode : MODES.FEEL;
  state.feel = clamp(Math.round(state.feel), 0, 100);
  state.phase = clamp(Math.round(state.phase), 0, 100);
  state.clockMinutes = clamp(Math.round(state.clockMinutes), 0, 1439);
  state.imperialBell = clamp(Math.round(state.imperialBell), 1, 33);
  state.moonIndex = clamp(Math.round(state.moonIndex), 0, MOON_PHASES.length - 1);
  state.season = SEASONS.includes(state.season) ? state.season : "spring";
  state.seasonMode = Object.values(SEASON_MODES).includes(state.seasonMode)
    ? state.seasonMode
    : SEASON_MODES.MANUAL;
  state.lightMode = ["preserve", "automatic", "always", "off"].includes(state.lightMode)
    ? state.lightMode
    : "preserve";
  state.naturalLightCutoff = clamp(Math.round(state.naturalLightCutoff), 1, 100);
  state.transitionSeconds = clamp(Number(state.transitionSeconds), 0, 30);
  state.lastAppliedDarkness = clamp(Number(state.lastAppliedDarkness), 0, 1);
  state.updatedAt = Number.isFinite(Number(state.updatedAt)) ? Number(state.updatedAt) : 0;
  state.updatedBy = typeof state.updatedBy === "string" ? state.updatedBy : null;
  return state;
}

export function effectiveSeason(state, options = {}) {
  const {
    seasonalEnabled = true,
    defaultSeason = "spring",
    deriveSeasonFromImperialMonth = false
  } = options;
  const safe = normalizeState(state);
  if (!seasonalEnabled) return "spring";
  if (safe.seasonMode === SEASON_MODES.CALENDAR || (deriveSeasonFromImperialMonth && safe.mode === MODES.IMPERIAL)) {
    if (safe.mode === MODES.CLOCK) return seasonForOrdinaryMonth(safe.ordinaryDate.month);
    if (safe.mode === MODES.IMPERIAL) return seasonForImperialMonth(safe.imperialDate.month);
  }
  return SEASONS.includes(safe.season) ? safe.season : defaultSeason;
}

export function computeDarkness(state, options = {}) {
  const safe = normalizeState(state);
  const season = effectiveSeason(safe, options);
  switch (safe.mode) {
    case MODES.PHASE:
      return darknessForClock(phaseToMinutes(safe.phase, season), {
        season,
        moonIndex: safe.moonIndex,
        seasonalEnabled: options.seasonalEnabled
      });
    case MODES.CLOCK:
      return darknessForClock(safe.clockMinutes, {
        season,
        moonIndex: safe.moonIndex,
        seasonalEnabled: options.seasonalEnabled
      });
    case MODES.IMPERIAL:
      return darknessForClock(imperialBellToMinutes(safe.imperialBell), {
        season,
        moonIndex: safe.moonIndex,
        seasonalEnabled: options.seasonalEnabled
      });
    case MODES.FEEL:
    default:
      return darknessForFeel(safe.feel);
  }
}
