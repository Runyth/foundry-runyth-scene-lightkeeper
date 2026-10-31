// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTROL_CHANGE_BEHAVIORS,
  MODE_SWITCH_BEHAVIORS,
  SEASON_MODES,
  SETTINGS,
  SETTINGS_LAUNCHER_SIZES
} from "../module/scripts/constants.mjs";
import { registerSettings } from "../module/scripts/settings.mjs";

function registeredSettings() {
  const settings = new Map();
  globalThis.game = {
    ready: false,
    user: { isGM: true },
    settings: {
      register: (_module, key, config) => settings.set(key, config),
      registerMenu() {}
    }
  };
  globalThis.ui = { controls: { render() {} } };
  registerSettings(class SettingsHub {});
  return settings;
}

test("safe interaction defaults require Apply for mode tabs but keep sliders immediate", () => {
  const settings = registeredSettings();
  const modes = settings.get(SETTINGS.MODE_SWITCH_BEHAVIOR);
  const controls = settings.get(SETTINGS.CONTROL_CHANGE_BEHAVIOR);

  assert.equal(modes.scope, "world");
  assert.equal(modes.restricted, true);
  assert.equal(modes.default, MODE_SWITCH_BEHAVIORS.APPLY);
  assert.deepEqual(Object.keys(modes.choices).sort(), [MODE_SWITCH_BEHAVIORS.APPLY, MODE_SWITCH_BEHAVIORS.IMMEDIATE].sort());

  assert.equal(controls.scope, "world");
  assert.equal(controls.restricted, true);
  assert.equal(controls.default, CONTROL_CHANGE_BEHAVIORS.IMMEDIATE);
  assert.deepEqual(Object.keys(controls.choices).sort(), [CONTROL_CHANGE_BEHAVIORS.APPLY, CONTROL_CHANGE_BEHAVIORS.IMMEDIATE].sort());
});

test("fog reset remains confirmed by default and can only be changed as a world setting", () => {
  const confirmation = registeredSettings().get(SETTINGS.CONFIRM_FOG_RESET);
  assert.equal(confirmation.scope, "world");
  assert.equal(confirmation.restricted, true);
  assert.equal(confirmation.config, true);
  assert.equal(confirmation.type, Boolean);
  assert.equal(confirmation.default, true);
});

test("calendar season derivation is opt-in and live slider preview is enabled per client", () => {
  const settings = registeredSettings();
  const seasonMode = settings.get(SETTINGS.DEFAULT_SEASON_MODE);
  const preview = settings.get(SETTINGS.LIVE_PREVIEW);

  assert.equal(seasonMode.scope, "world");
  assert.equal(seasonMode.default, SEASON_MODES.MANUAL);
  assert.deepEqual(Object.keys(seasonMode.choices).sort(), [SEASON_MODES.CALENDAR, SEASON_MODES.MANUAL].sort());

  assert.equal(preview.scope, "client");
  assert.equal(preview.default, true);
});


test("Settings sidebar launcher keeps the current size by default and offers a global compact mode", () => {
  const launcher = registeredSettings().get(SETTINGS.SETTINGS_LAUNCHER_SIZE);
  assert.equal(launcher.scope, "world");
  assert.equal(launcher.restricted, true);
  assert.equal(launcher.config, true);
  assert.equal(launcher.type, String);
  assert.equal(launcher.default, SETTINGS_LAUNCHER_SIZES.STANDARD);
  assert.deepEqual(
    Object.keys(launcher.choices).sort(),
    [SETTINGS_LAUNCHER_SIZES.COMPACT, SETTINGS_LAUNCHER_SIZES.STANDARD].sort()
  );
});


test("changing launcher size updates an already-rendered Settings launcher immediately", () => {
  const settings = registeredSettings();
  const classes = new Set();
  globalThis.document = {
    getElementById: () => ({
      classList: {
        toggle(name, enabled) {
          if (enabled) classes.add(name);
          else classes.delete(name);
        }
      }
    })
  };

  const launcher = settings.get(SETTINGS.SETTINGS_LAUNCHER_SIZE);
  launcher.onChange(SETTINGS_LAUNCHER_SIZES.COMPACT);
  assert.equal(classes.has("compact"), true);
  launcher.onChange(SETTINGS_LAUNCHER_SIZES.STANDARD);
  assert.equal(classes.has("compact"), false);
  delete globalThis.document;
});
