// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  CONTROL_CHANGE_BEHAVIORS,
  MODE_SWITCH_BEHAVIORS,
  MODULE_ID,
  MODES,
  MOON_PHASES,
  SCENE_SYNC_MODES,
  SEASON_MODES,
  SEASONS,
  SETTINGS
} from "../constants.mjs";
import {
  descriptiveBand,
  formatClock,
  imperialBellToMinutes,
  imperialUmgangForDay,
  imperialWatchForBell,
  minutesToImperialBell,
  phaseToMinutes
} from "../astronomy.mjs";
import {
  calculationOptions,
  canManageScene,
  getActiveScene,
  getSceneState,
  sceneDefaults
} from "../scene-service.mjs";
import { computeDarkness, effectiveSeason, mergeStatePatch, normalizeState } from "../state.mjs";
import { getTimeSystemDisplays } from "../time-systems.mjs";

function localize(key) {
  return game.i18n.localize(key);
}

function options(items, selected, prefix) {
  return items.map((value) => ({
    value,
    label: localize(`${prefix}.${value[0].toUpperCase()}${value.slice(1)}`),
    selected: value === selected
  }));
}

function imperialTimeLabel(minutes) {
  const bell = minutesToImperialBell(minutes);
  const watch = imperialWatchForBell(bell);
  return game.i18n.format("SLK.Imperial.CompactTime", {
    bell,
    watch: localize(watch.label),
    bellInWatch: watch.bellInWatch
  });
}

function externalTimeDisplays(minutes, mode, state, scene, approximate) {
  return getTimeSystemDisplays({
    minutes,
    mode,
    state,
    scene,
    approximate,
    localize
  });
}

export function buildSceneContext({
  compact = false,
  stateOverride = null,
  modeOverride = null,
  hasPendingChanges = false
} = {}) {
  const scene = getActiveScene();
  const persistedState = getSceneState(scene);
  const merged = stateOverride ? mergeStatePatch(persistedState, stateOverride) : persistedState;
  const state = normalizeState(merged, sceneDefaults());
  const mode = Object.values(MODES).includes(modeOverride) ? modeOverride : state.mode;
  const displayState = normalizeState({ ...state, mode }, sceneDefaults());
  const calc = calculationOptions();
  const season = effectiveSeason(displayState, calc);
  const darkness = computeDarkness(displayState, calc);
  const phaseMinutes = phaseToMinutes(displayState.phase, season);
  const imperialMinutes = imperialBellToMinutes(displayState.imperialBell);
  const watch = imperialWatchForBell(displayState.imperialBell);
  const umgang = imperialUmgangForDay(displayState.imperialDate.day);
  const sceneSyncMode = game.settings.get(MODULE_ID, SETTINGS.SCENE_SYNC_MODE);
  const sceneSyncKey = {
    [SCENE_SYNC_MODES.OFF]: "SLK.SceneSync.Off",
    [SCENE_SYNC_MODES.GRADE]: "SLK.SceneSync.Grade",
    [SCENE_SYNC_MODES.PROFILE]: "SLK.SceneSync.Profile"
  }[sceneSyncMode] ?? "SLK.SceneSync.Off";
  const modeSwitchBehavior = game.settings.get(MODULE_ID, SETTINGS.MODE_SWITCH_BEHAVIOR);
  const controlChangeBehavior = game.settings.get(MODULE_ID, SETTINGS.CONTROL_CHANGE_BEHAVIOR);
  const calendarSeasonApplicable = [MODES.CLOCK, MODES.IMPERIAL].includes(mode);

  return {
    compact,
    hasScene: Boolean(scene),
    sceneName: scene?.name ?? localize("SLK.Common.NoScene"),
    canManage: canManageScene(scene),
    state: displayState,
    persistedState,
    mode,
    appliedMode: persistedState.mode,
    modes: Object.values(MODES).map((value) => ({
      value,
      label: localize(`SLK.Mode.${value[0].toUpperCase()}${value.slice(1)}`),
      icon: {
        feel: "fa-eye",
        phase: "fa-sun",
        clock: "fa-clock",
        imperial: "fa-bell"
      }[value],
      active: value === mode,
      applied: value === persistedState.mode
    })),
    darkness,
    darknessPercent: Math.round(darkness * 100),
    band: localize(`SLK.Band.${descriptiveBand(darkness)}`),
    clockLabel: formatClock(displayState.clockMinutes),
    phaseClockLabel: formatClock(phaseMinutes),
    phaseImperialLabel: imperialTimeLabel(phaseMinutes),
    clockImperialLabel: imperialTimeLabel(displayState.clockMinutes),
    imperialClockLabel: formatClock(imperialMinutes),
    phaseTimeSystems: externalTimeDisplays(phaseMinutes, MODES.PHASE, displayState, scene, true),
    clockTimeSystems: externalTimeDisplays(displayState.clockMinutes, MODES.CLOCK, displayState, scene, false),
    imperialTimeSystems: externalTimeDisplays(imperialMinutes, MODES.IMPERIAL, displayState, scene, false),
    watchLabel: localize(watch.label),
    bellInWatch: watch.bellInWatch,
    umgang: umgang.umgang,
    dayInUmgang: umgang.dayInUmgang,
    moonPhases: MOON_PHASES.map((phase, index) => ({
      ...phase,
      index,
      label: localize(`SLK.Moon.${phase.id[0].toUpperCase()}${phase.id.slice(1)}`),
      selected: index === displayState.moonIndex
    })),
    moonLabel: localize(`SLK.Moon.${MOON_PHASES[displayState.moonIndex].id[0].toUpperCase()}${MOON_PHASES[displayState.moonIndex].id.slice(1)}`),
    seasons: options(SEASONS, displayState.season, "SLK.Season"),
    seasonModes: Object.values(SEASON_MODES).map((value) => ({
      value,
      label: localize(`SLK.SeasonMode.${value[0].toUpperCase()}${value.slice(1)}`),
      selected: value === displayState.seasonMode,
      disabled: value === SEASON_MODES.CALENDAR && !calendarSeasonApplicable
    })),
    calendarSeasonSelected: displayState.seasonMode === SEASON_MODES.CALENDAR,
    calendarSeasonApplicable,
    lightModes: ["preserve", "automatic", "always", "off"].map((value) => ({
      value,
      label: localize(`SLK.LightMode.${value[0].toUpperCase()}${value.slice(1)}`),
      selected: value === displayState.lightMode
    })),
    fogExploration: Boolean(scene?.fog?.exploration),
    tokenVision: Boolean(scene?.tokenVision),
    darknessLocked: Boolean(scene?.environment?.darknessLevelLock),
    seasonalEnabled: calc.seasonalEnabled,
    effectiveSeasonLabel: localize(`SLK.Season.${season[0].toUpperCase()}${season.slice(1)}`),
    sceneSyncEnabled: sceneSyncMode !== SCENE_SYNC_MODES.OFF,
    sceneSyncLabel: localize(sceneSyncKey),
    modeSwitchRequiresApply: modeSwitchBehavior !== MODE_SWITCH_BEHAVIORS.IMMEDIATE,
    controlChangesRequireApply: controlChangeBehavior === CONTROL_CHANGE_BEHAVIORS.APPLY,
    hasPendingChanges,
    selectedModePending: mode !== persistedState.mode
  };
}
