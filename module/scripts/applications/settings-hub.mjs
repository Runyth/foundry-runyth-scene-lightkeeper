// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  MODULE_ID,
  MODULE_VERSION,
  SCENE_SYNC_MODES,
  SETTINGS
} from "../constants.mjs";
import { loadWindowState, saveWindowState } from "../ui/window-state.mjs";
import { runUiAction } from "../ui/action-runner.mjs";
import { showHowToGuide } from "../ui/how-to.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SettingsHub extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "runyth-scene-lightkeeper-settings-hub",
    classes: ["slk-app", "slk-settings-hub"],
    window: {
      title: "SLK.SettingsHub.Title",
      icon: "fa-solid fa-sliders",
      resizable: true
    },
    position: { width: 620, height: 560 },
    actions: {
      openPanel: SettingsHub.onOpenPanel,
      toggleFloating: SettingsHub.onToggleFloating,
      resetLayout: SettingsHub.onResetLayout,
      openGuide: SettingsHub.onOpenGuide
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/settings-hub.hbs` }
  };

  constructor(options = {}) {
    super({
      ...options,
      position: {
        ...loadWindowState(SETTINGS.SETTINGS_HUB_STATE, { width: 620, height: 560 }),
        ...(options.position ?? {})
      }
    });
    this._saveTimer = null;
    this._ignorePositionSave = false;
  }

  async _prepareContext(options) {
    const sceneSyncMode = game.settings.get(MODULE_ID, SETTINGS.SCENE_SYNC_MODE);
    const version = game.modules.get(MODULE_ID)?.version ?? MODULE_VERSION;
    const foundryVersion = game.version ?? game.release?.version ?? "13";
    return {
      ...(await super._prepareContext(options)),
      version,
      footerLabel: game.i18n.format("SLK.SettingsHub.Footer", { version, foundryVersion }),
      floatingEnabled: game.settings.get(MODULE_ID, SETTINGS.FLOATING_ENABLED),
      seasonalEnabled: game.settings.get(MODULE_ID, SETTINGS.SEASONAL_ENABLED),
      sceneSyncEnabled: sceneSyncMode !== SCENE_SYNC_MODES.OFF,
      sceneSyncLabel: game.i18n.localize({
        [SCENE_SYNC_MODES.OFF]: "SLK.SceneSync.Off",
        [SCENE_SYNC_MODES.GRADE]: "SLK.SceneSync.Grade",
        [SCENE_SYNC_MODES.PROFILE]: "SLK.SceneSync.Profile"
      }[sceneSyncMode] ?? "SLK.SceneSync.Off")
    };
  }

  _onPosition(position) {
    super._onPosition(position);
    if (this._ignorePositionSave) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => void saveWindowState(SETTINGS.SETTINGS_HUB_STATE, position), 250);
  }

  _onClose(options) {
    clearTimeout(this._saveTimer);
    void saveWindowState(SETTINGS.SETTINGS_HUB_STATE, this.position);
    super._onClose(options);
  }

  resetLayout() {
    clearTimeout(this._saveTimer);
    this._ignorePositionSave = true;
    this.setPosition(loadWindowState(SETTINGS.SETTINGS_HUB_STATE, { width: 620, height: 560 }));
    this._ignorePositionSave = false;
  }

  static onOpenPanel(event) {
    event.preventDefault();
    return runUiAction("Settings hub open panel", () => globalThis.SceneLightkeeper?.open?.());
  }

  static onToggleFloating(event) {
    event.preventDefault();
    return runUiAction("Settings hub floating board", () => globalThis.SceneLightkeeper?.toggleFloating?.());
  }

  static onOpenGuide(event) {
    event.preventDefault();
    return runUiAction("Settings hub guide", () => showHowToGuide());
  }

  static onResetLayout(event) {
    event.preventDefault();
    return runUiAction("Settings hub layout reset", () => globalThis.SceneLightkeeper?.resetLayout?.());
  }
}
