// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, MODES, SETTINGS } from "../constants.mjs";
import { patchAndApplySceneState } from "../scene-service.mjs";
import { requestFogReset } from "./fog-reset.mjs";
import { runUiAction } from "./action-runner.mjs";

function safe(action) {
  return runUiAction("Scene controls", action);
}

export function registerSceneControls(controls) {
  if (!game.user?.isGM || !game.settings.get(MODULE_ID, SETTINGS.SHOW_SCENE_CONTROL)) return;
  if (!controls || typeof controls !== "object" || Array.isArray(controls) || controls[MODULE_ID]) return;
  controls[MODULE_ID] = {
    name: MODULE_ID,
    title: "SLK.Controls.Group",
    icon: "fa-solid fa-sun",
    order: 80,
    visible: true,
    activeTool: "openPanel",
    tools: {
      openPanel: {
        name: "openPanel",
        title: "SLK.Controls.OpenPanel",
        icon: "fa-solid fa-sliders",
        order: 1,
        button: true,
        onChange: () => safe(() => globalThis.SceneLightkeeper?.open?.())
      },
      floating: {
        name: "floating",
        title: "SLK.Controls.Floating",
        icon: "fa-solid fa-window-restore",
        order: 2,
        button: true,
        visible: game.settings.get(MODULE_ID, SETTINGS.FLOATING_ENABLED),
        onChange: () => safe(() => globalThis.SceneLightkeeper?.toggleFloating?.())
      },
      bright: {
        name: "bright",
        title: "SLK.Controls.Bright",
        icon: "fa-solid fa-sun",
        order: 3,
        button: true,
        onChange: () => safe(() => patchAndApplySceneState({ mode: MODES.FEEL, feel: 0 }, { source: "scene-control" }))
      },
      twilight: {
        name: "twilight",
        title: "SLK.Controls.Twilight",
        icon: "fa-solid fa-cloud-sun",
        order: 4,
        button: true,
        onChange: () => safe(() => patchAndApplySceneState({ mode: MODES.FEEL, feel: 50 }, { source: "scene-control" }))
      },
      night: {
        name: "night",
        title: "SLK.Controls.Night",
        icon: "fa-solid fa-moon",
        order: 5,
        button: true,
        onChange: () => safe(() => patchAndApplySceneState({ mode: MODES.FEEL, feel: 88 }, { source: "scene-control" }))
      },
      resetFog: {
        name: "resetFog",
        title: "SLK.Controls.ResetFog",
        icon: "fa-solid fa-eraser",
        order: 6,
        button: true,
        onChange: () => safe(() => requestFogReset())
      }
    }
  };
}
