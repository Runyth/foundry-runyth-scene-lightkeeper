// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  CONTROL_CHANGE_BEHAVIORS,
  MODE_SWITCH_BEHAVIORS,
  MODULE_ID,
  SCENE_SYNC_MODES,
  SEASON_MODES,
  SETTINGS,
  SETTINGS_LAUNCHER_SIZES
} from "./constants.mjs";

const shared = {
  scope: "world",
  config: true,
  restricted: true
};

function refreshSceneControls() {
  void Promise.resolve().then(() => ui.controls?.render?.({ force: false })).catch((error) => {
    console.warn(`${MODULE_ID} | Could not refresh Scene Controls after a setting change`, error);
  });
}


function refreshSettingsLauncher(value) {
  try {
    const launcher = globalThis.document?.getElementById?.(`${MODULE_ID}-settings-launcher`);
    if (!launcher) return;
    launcher.classList?.toggle?.("compact", value === SETTINGS_LAUNCHER_SIZES.COMPACT);
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not refresh the Settings sidebar launcher size`, error);
  }
}

function refreshApplications() {
  void Promise.resolve().then(() => globalThis.SceneLightkeeper?.refresh?.()).catch((error) => {
    console.warn(`${MODULE_ID} | Could not refresh Scene Lightkeeper after a setting change`, error);
  });
}

function captureCurrentLighting(value) {
  if (value === SCENE_SYNC_MODES.OFF || !game.ready || !game.user?.isGM) return;
  void Promise.resolve().then(() => globalThis.SceneLightkeeper?.captureCurrentLighting?.()).catch((error) => {
    console.warn(`${MODULE_ID} | Could not capture current lighting after enabling scene synchronization`, error);
  });
}

export function registerSettings(SettingsHubClass) {
  game.settings.register(MODULE_ID, SETTINGS.SHOW_SCENE_CONTROL, {
    ...shared,
    name: "SLK.Settings.ShowSceneControl.Name",
    hint: "SLK.Settings.ShowSceneControl.Hint",
    type: Boolean,
    default: true,
    onChange: refreshSceneControls
  });
  game.settings.register(MODULE_ID, SETTINGS.SETTINGS_LAUNCHER_SIZE, {
    ...shared,
    name: "SLK.Settings.SettingsLauncherSize.Name",
    hint: "SLK.Settings.SettingsLauncherSize.Hint",
    type: String,
    choices: {
      [SETTINGS_LAUNCHER_SIZES.STANDARD]: "SLK.SettingsLauncher.SizeStandard",
      [SETTINGS_LAUNCHER_SIZES.COMPACT]: "SLK.SettingsLauncher.SizeCompact"
    },
    default: SETTINGS_LAUNCHER_SIZES.STANDARD,
    onChange: refreshSettingsLauncher
  });
  game.settings.register(MODULE_ID, SETTINGS.FLOATING_ENABLED, {
    ...shared,
    name: "SLK.Settings.FloatingEnabled.Name",
    hint: "SLK.Settings.FloatingEnabled.Hint",
    type: Boolean,
    default: true,
    onChange: refreshSceneControls
  });
  game.settings.register(MODULE_ID, SETTINGS.AUTO_OPEN_FLOATING, {
    scope: "client",
    config: true,
    name: "SLK.Settings.AutoOpenFloating.Name",
    hint: "SLK.Settings.AutoOpenFloating.Hint",
    type: Boolean,
    default: false
  });
  game.settings.register(MODULE_ID, SETTINGS.MODE_SWITCH_BEHAVIOR, {
    ...shared,
    name: "SLK.Settings.ModeSwitchBehavior.Name",
    hint: "SLK.Settings.ModeSwitchBehavior.Hint",
    type: String,
    choices: {
      [MODE_SWITCH_BEHAVIORS.APPLY]: "SLK.Behavior.ModeSwitchApply",
      [MODE_SWITCH_BEHAVIORS.IMMEDIATE]: "SLK.Behavior.ModeSwitchImmediate"
    },
    default: MODE_SWITCH_BEHAVIORS.APPLY,
    onChange: refreshApplications
  });
  game.settings.register(MODULE_ID, SETTINGS.CONTROL_CHANGE_BEHAVIOR, {
    ...shared,
    name: "SLK.Settings.ControlChangeBehavior.Name",
    hint: "SLK.Settings.ControlChangeBehavior.Hint",
    type: String,
    choices: {
      [CONTROL_CHANGE_BEHAVIORS.IMMEDIATE]: "SLK.Behavior.ControlImmediate",
      [CONTROL_CHANGE_BEHAVIORS.APPLY]: "SLK.Behavior.ControlApply"
    },
    default: CONTROL_CHANGE_BEHAVIORS.IMMEDIATE,
    onChange: refreshApplications
  });
  game.settings.register(MODULE_ID, SETTINGS.LIVE_PREVIEW, {
    scope: "client",
    config: true,
    name: "SLK.Settings.LivePreview.Name",
    hint: "SLK.Settings.LivePreview.Hint",
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, SETTINGS.SEASONAL_ENABLED, {
    ...shared,
    name: "SLK.Settings.SeasonalEnabled.Name",
    hint: "SLK.Settings.SeasonalEnabled.Hint",
    type: Boolean,
    default: true,
    onChange: refreshApplications
  });
  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_SEASON, {
    ...shared,
    name: "SLK.Settings.DefaultSeason.Name",
    hint: "SLK.Settings.DefaultSeason.Hint",
    type: String,
    choices: {
      spring: "SLK.Season.Spring",
      summer: "SLK.Season.Summer",
      autumn: "SLK.Season.Autumn",
      winter: "SLK.Season.Winter"
    },
    default: "spring"
  });
  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_SEASON_MODE, {
    ...shared,
    name: "SLK.Settings.DefaultSeasonMode.Name",
    hint: "SLK.Settings.DefaultSeasonMode.Hint",
    type: String,
    choices: {
      [SEASON_MODES.MANUAL]: "SLK.SeasonMode.Manual",
      [SEASON_MODES.CALENDAR]: "SLK.SeasonMode.Calendar"
    },
    default: SEASON_MODES.MANUAL
  });
  game.settings.register(MODULE_ID, SETTINGS.DERIVE_SEASON_FROM_IMPERIAL_MONTH, {
    scope: "world",
    config: false,
    restricted: true,
    type: Boolean,
    default: false
  });
  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_LIGHT_MODE, {
    ...shared,
    name: "SLK.Settings.DefaultLightMode.Name",
    hint: "SLK.Settings.DefaultLightMode.Hint",
    type: String,
    choices: {
      preserve: "SLK.LightMode.Preserve",
      automatic: "SLK.LightMode.Automatic",
      always: "SLK.LightMode.Always",
      off: "SLK.LightMode.Off"
    },
    default: "automatic"
  });
  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_NATURAL_LIGHT_CUTOFF, {
    ...shared,
    name: "SLK.Settings.DefaultCutoff.Name",
    hint: "SLK.Settings.DefaultCutoff.Hint",
    type: Number,
    range: { min: 1, max: 100, step: 1 },
    default: 72
  });
  game.settings.register(MODULE_ID, SETTINGS.SCENE_SYNC_MODE, {
    ...shared,
    name: "SLK.Settings.SceneSyncMode.Name",
    hint: "SLK.Settings.SceneSyncMode.Hint",
    type: String,
    choices: {
      [SCENE_SYNC_MODES.OFF]: "SLK.SceneSync.Off",
      [SCENE_SYNC_MODES.GRADE]: "SLK.SceneSync.Grade",
      [SCENE_SYNC_MODES.PROFILE]: "SLK.SceneSync.Profile"
    },
    default: SCENE_SYNC_MODES.OFF,
    onChange: captureCurrentLighting
  });
  game.settings.register(MODULE_ID, SETTINGS.SCENE_SYNC_INITIAL_LOAD, {
    ...shared,
    name: "SLK.Settings.SceneSyncInitialLoad.Name",
    hint: "SLK.Settings.SceneSyncInitialLoad.Hint",
    type: Boolean,
    default: false
  });
  game.settings.register(MODULE_ID, SETTINGS.CONFIRM_FOG_RESET, {
    ...shared,
    name: "SLK.Settings.ConfirmFogReset.Name",
    hint: "SLK.Settings.ConfirmFogReset.Hint",
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, SETTINGS.SHOW_FIRST_RUN, {
    scope: "client",
    config: true,
    name: "SLK.Settings.ShowFirstRun.Name",
    hint: "SLK.Settings.ShowFirstRun.Hint",
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, SETTINGS.PANEL_STATE, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.register(MODULE_ID, SETTINGS.FLOATING_STATE, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.register(MODULE_ID, SETTINGS.SETTINGS_HUB_STATE, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.register(MODULE_ID, SETTINGS.CURRENT_LIGHTING_SNAPSHOT, {
    scope: "world",
    config: false,
    restricted: true,
    type: Object,
    default: {}
  });
  game.settings.register(MODULE_ID, SETTINGS.LAST_SEEN_VERSION, {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });

  game.settings.registerMenu(MODULE_ID, "settingsHub", {
    name: "SLK.SettingsHub.Name",
    label: "SLK.SettingsHub.Label",
    hint: "SLK.SettingsHub.Hint",
    icon: "fa-solid fa-sun",
    type: SettingsHubClass,
    restricted: true
  });
}
