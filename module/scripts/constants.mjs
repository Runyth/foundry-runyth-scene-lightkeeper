// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export const MODULE_ID = "runyth-scene-lightkeeper";
export const MODULE_VERSION = "1.1.6";
export const API_VERSION = "1.1.6";
export const STATE_SCHEMA = 2;
export const LIGHTING_SNAPSHOT_SCHEMA = 2;

export const MODES = Object.freeze({
  FEEL: "feel",
  PHASE: "phase",
  CLOCK: "clock",
  IMPERIAL: "imperial"
});

export const MODE_SWITCH_BEHAVIORS = Object.freeze({
  APPLY: "apply",
  IMMEDIATE: "immediate"
});

export const CONTROL_CHANGE_BEHAVIORS = Object.freeze({
  IMMEDIATE: "immediate",
  APPLY: "apply"
});

export const SETTINGS_LAUNCHER_SIZES = Object.freeze({
  STANDARD: "standard",
  COMPACT: "compact"
});

export const SEASON_MODES = Object.freeze({
  MANUAL: "manual",
  CALENDAR: "calendar"
});

export const SCENE_SYNC_MODES = Object.freeze({
  OFF: "off",
  GRADE: "grade",
  PROFILE: "profile"
});

export const SEASONS = Object.freeze(["spring", "summer", "autumn", "winter"]);

export const MOON_PHASES = Object.freeze([
  { id: "new", illumination: 0, icon: "fa-circle" },
  { id: "crescent", illumination: 0.25, icon: "fa-moon" },
  { id: "quarter", illumination: 0.5, icon: "fa-circle-half-stroke" },
  { id: "gibbous", illumination: 0.75, icon: "fa-moon" },
  { id: "full", illumination: 1, icon: "fa-circle" }
]);

export const SEASON_PROFILES = Object.freeze({
  spring: { sunrise: 390, sunset: 1170, label: "SLK.Season.Spring" },
  summer: { sunrise: 285, sunset: 1290, label: "SLK.Season.Summer" },
  autumn: { sunrise: 435, sunset: 1080, label: "SLK.Season.Autumn" },
  winter: { sunrise: 495, sunset: 990, label: "SLK.Season.Winter" }
});

export const IMPERIAL_WATCHES = Object.freeze([
  { id: "night", first: 1, last: 11, label: "SLK.Imperial.NightWatch" },
  { id: "crown", first: 12, last: 22, label: "SLK.Imperial.CrownWatch" },
  { id: "lantern", first: 23, last: 33, label: "SLK.Imperial.LanternWatch" }
]);

export const DEFAULT_STATE = Object.freeze({
  schema: STATE_SCHEMA,
  mode: MODES.FEEL,
  feel: 0,
  phase: 50,
  clockMinutes: 720,
  imperialBell: 17,
  moonIndex: 0,
  season: "spring",
  seasonMode: SEASON_MODES.MANUAL,
  ordinaryDate: {
    year: 2026,
    month: 8,
    day: 2
  },
  imperialDate: {
    year: 443,
    month: 3,
    day: 3
  },
  lightMode: "automatic",
  naturalLightCutoff: 72,
  transitionSeconds: 0,
  lastAppliedDarkness: 0,
  updatedAt: 0,
  updatedBy: null
});

export const SETTINGS = Object.freeze({
  SHOW_SCENE_CONTROL: "showSceneControl",
  SETTINGS_LAUNCHER_SIZE: "settingsLauncherSize",
  AUTO_OPEN_FLOATING: "autoOpenFloating",
  FLOATING_ENABLED: "floatingEnabled",
  LIVE_PREVIEW: "livePreview",
  MODE_SWITCH_BEHAVIOR: "modeSwitchBehavior",
  CONTROL_CHANGE_BEHAVIOR: "controlChangeBehavior",
  SEASONAL_ENABLED: "seasonalEnabled",
  DEFAULT_SEASON: "defaultSeason",
  DEFAULT_SEASON_MODE: "defaultSeasonMode",
  DERIVE_SEASON_FROM_IMPERIAL_MONTH: "deriveSeasonFromImperialMonth",
  DEFAULT_LIGHT_MODE: "defaultLightMode",
  DEFAULT_NATURAL_LIGHT_CUTOFF: "defaultNaturalLightCutoff",
  SCENE_SYNC_MODE: "sceneSyncMode",
  SCENE_SYNC_INITIAL_LOAD: "sceneSyncInitialLoad",
  CONFIRM_FOG_RESET: "confirmFogReset",
  SHOW_FIRST_RUN: "showFirstRun",
  PANEL_STATE: "panelState",
  FLOATING_STATE: "floatingState",
  SETTINGS_HUB_STATE: "settingsHubState",
  CURRENT_LIGHTING_SNAPSHOT: "currentLightingSnapshot",
  LAST_SEEN_VERSION: "lastSeenVersion"
});
