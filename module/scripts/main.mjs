// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  API_VERSION,
  MODULE_ID,
  MODULE_VERSION,
  SCENE_SYNC_MODES,
  SETTINGS
} from "./constants.mjs";
import { ControlPanel } from "./applications/control-panel.mjs";
import { FloatingBoard } from "./applications/floating-board.mjs";
import { SettingsHub } from "./applications/settings-hub.mjs";
import { registerSettings } from "./settings.mjs";
import { registerSceneControls } from "./ui/scene-controls.mjs";
import { renderSettingsLauncher } from "./ui/settings-launcher.mjs";
import { clearWindowStates } from "./ui/window-state.mjs";
import {
  applySceneState,
  captureCurrentLighting,
  captureLightingSnapshot,
  getActiveScene,
  getCurrentLightingSnapshot,
  getSceneState,
  patchAndApplySceneState,
  resetFog,
  setDarknessLock,
  setFogExploration,
  setTokenVision,
  syncLightingToScene
} from "./scene-service.mjs";
import { computeDarkness } from "./state.mjs";
import { listTimeSystems, registerTimeSystem, unregisterTimeSystem } from "./time-systems.mjs";
import { requestFogReset } from "./ui/fog-reset.mjs";
import { showHowToGuide } from "./ui/how-to.mjs";

let panel = null;
let floating = null;
let settingsHub = null;
let lastCanvasSceneId = null;
let sceneSyncGeneration = 0;
let sceneSyncQueue = Promise.resolve();
let carriedLightingSnapshot = null;
let carriedSceneId = null;

function openPanel() {
  panel ??= new ControlPanel();
  return panel.render({ force: true });
}

function openSettings() {
  settingsHub ??= new SettingsHub();
  return settingsHub.render({ force: true });
}

function openFloating() {
  if (!game.settings.get(MODULE_ID, SETTINGS.FLOATING_ENABLED)) {
    ui.notifications.warn(game.i18n.localize("SLK.Notification.FloatingDisabled"));
    return null;
  }
  floating ??= new FloatingBoard();
  if (floating.rendered) {
    floating.bringToFront?.();
    return Promise.resolve(floating);
  }
  return floating.render({ force: true });
}

function toggleFloating() {
  return openFloating();
}

function renderIfOpen(app) {
  if (!app?.rendered) return;
  void Promise.resolve().then(() => app.render({ force: false })).catch((error) => {
    if (app.rendered) console.error(`${MODULE_ID} | Could not refresh an open application`, error);
  });
}

function refreshApps() {
  for (const app of [panel, floating, settingsHub]) renderIfOpen(app);
}

async function resetLayout() {
  await clearWindowStates([
    SETTINGS.PANEL_STATE,
    SETTINGS.FLOATING_STATE,
    SETTINGS.SETTINGS_HUB_STATE
  ]);
  for (const app of [panel, floating, settingsHub]) app?.resetLayout?.();
  ui.notifications.info(game.i18n.localize("SLK.Notification.LayoutReset"));
}

function sceneById(id) {
  return id ? game.scenes?.get?.(id) ?? null : null;
}

function reportSceneSyncError(error) {
  console.error(`${MODULE_ID} | Scene-switch lighting synchronization`, error);
  ui.notifications.error(error?.message ?? game.i18n.localize("SLK.Error.SceneSync"));
}

function queueSceneSynchronization(canvasInstance) {
  refreshApps();
  const scene = canvasInstance?.scene ?? getActiveScene();
  if (!scene) return;

  const previousSceneId = lastCanvasSceneId;
  const isInitialCanvas = previousSceneId === null;
  const isSceneSwitch = previousSceneId !== null && previousSceneId !== scene.id;
  lastCanvasSceneId = scene.id;

  if (!game.user?.isGM) return;
  const mode = game.settings.get(MODULE_ID, SETTINGS.SCENE_SYNC_MODE);
  if (mode === SCENE_SYNC_MODES.OFF) return;

  const applyInitial = game.settings.get(MODULE_ID, SETTINGS.SCENE_SYNC_INITIAL_LOAD);
  if (!isSceneSwitch && !(isInitialCanvas && applyInitial)) {
    if (isInitialCanvas) {
      carriedLightingSnapshot = captureLightingSnapshot(scene, getSceneState(scene));
      carriedSceneId = scene.id;
      void captureCurrentLighting(scene).catch(reportSceneSyncError);
    }
    return;
  }

  const sourceScene = isSceneSwitch ? sceneById(previousSceneId) : null;
  if (sourceScene && (carriedSceneId === previousSceneId || !carriedLightingSnapshot)) {
    carriedLightingSnapshot = captureLightingSnapshot(sourceScene, getSceneState(sourceScene));
    carriedSceneId = previousSceneId;
  }
  const snapshot = carriedLightingSnapshot;
  const generation = ++sceneSyncGeneration;
  sceneSyncQueue = sceneSyncQueue
    .catch(() => undefined)
    .then(async () => {
      if (generation !== sceneSyncGeneration || getActiveScene()?.id !== scene.id) return;
      const result = await syncLightingToScene(scene, {
        mode,
        snapshot,
        sourceScene: snapshot ? null : sourceScene,
        notify: false,
        source: isInitialCanvas ? "initial-load" : "scene-switch"
      });
      if (result.reason === "no-snapshot") await captureCurrentLighting(scene);
      carriedLightingSnapshot = captureLightingSnapshot(scene, result.state ?? getSceneState(scene));
      carriedSceneId = scene.id;
      if (result.applied) refreshApps();
    })
    .catch(reportSceneSyncError);
}

function publicApi() {
  return Object.freeze({
    apiVersion: API_VERSION,
    moduleVersion: MODULE_VERSION,
    open: openPanel,
    openSettings,
    openFloating,
    toggleFloating,
    resetLayout,
    refresh: refreshApps,
    showGuide: showHowToGuide,
    getState: (scene = getActiveScene()) => getSceneState(scene),
    getCurrentLightingSnapshot,
    captureCurrentLighting,
    syncLightingToScene,
    computeDarkness,
    registerTimeSystem: (definition) => {
      const unregister = registerTimeSystem(definition);
      refreshApps();
      return () => {
        const removed = unregister();
        if (removed) refreshApps();
        return removed;
      };
    },
    unregisterTimeSystem: (id) => {
      const removed = unregisterTimeSystem(id);
      if (removed) refreshApps();
      return removed;
    },
    getTimeSystems: listTimeSystems,
    apply: (state, options = {}) => applySceneState(options.scene ?? getActiveScene(), state, options),
    patch: patchAndApplySceneState,
    setFeel: (feel, options = {}) => patchAndApplySceneState({ mode: "feel", feel }, options),
    setPhase: (phase, options = {}) => patchAndApplySceneState({ mode: "phase", phase }, options),
    setClock: (clockMinutes, options = {}) => patchAndApplySceneState({ mode: "clock", clockMinutes }, options),
    setImperialBell: (imperialBell, options = {}) => patchAndApplySceneState({ mode: "imperial", imperialBell }, options),
    setMoon: (moonIndex, options = {}) => patchAndApplySceneState({ moonIndex }, options),
    setSeason: (season, options = {}) => patchAndApplySceneState({ season }, options),
    setDarknessLock,
    setFogExploration,
    setTokenVision,
    requestFogReset,
    resetFog
  });
}

async function showFirstRun() {
  if (!game.user?.isGM || !game.settings.get(MODULE_ID, SETTINGS.SHOW_FIRST_RUN)) return;
  const previous = game.settings.get(MODULE_ID, SETTINGS.LAST_SEEN_VERSION);
  if (previous === MODULE_VERSION) return;
  await game.settings.set(MODULE_ID, SETTINGS.LAST_SEEN_VERSION, MODULE_VERSION);
  const { DialogV2 } = foundry.applications.api;
  const open = await DialogV2.confirm({
    window: { title: game.i18n.format("SLK.FirstRun.Title", { version: MODULE_VERSION }) },
    content: `<div class="slk-dialog"><p>${game.i18n.localize("SLK.FirstRun.Intro")}</p><p>${game.i18n.localize("SLK.FirstRun.Detail")}</p></div>`,
    yes: { label: game.i18n.localize("SLK.FirstRun.Open"), icon: "fa-solid fa-sun" },
    no: { label: game.i18n.localize("SLK.Common.Close") },
    modal: false,
    rejectClose: false
  });
  if (open) await openPanel();
}

Hooks.once("init", () => {
  registerSettings(SettingsHub);
  if (!Handlebars.helpers.slkEq) Handlebars.registerHelper("slkEq", (left, right) => left === right);
  Hooks.on("getSceneControlButtons", registerSceneControls);
  Hooks.on("renderSettings", renderSettingsLauncher);
  const module = game.modules.get(MODULE_ID);
  const api = publicApi();
  if (module) module.api = api;
  globalThis.SceneLightkeeper = api;
  Hooks.callAll?.("sceneLightkeeperReady", api);
  console.info(`${MODULE_ID} | Initialized v${MODULE_VERSION}; API ${API_VERSION}.`);
});

Hooks.once("ready", () => {
  if (game.user?.isGM && game.settings.get(MODULE_ID, SETTINGS.FLOATING_ENABLED) && game.settings.get(MODULE_ID, SETTINGS.AUTO_OPEN_FLOATING)) {
    void Promise.resolve().then(() => openFloating()).catch((error) => {
      console.error(`${MODULE_ID} | Could not auto-open the floating board`, error);
    });
  }
  void showFirstRun().catch((error) => console.error(`${MODULE_ID} | First-run guide`, error));
});

Hooks.on("canvasReady", queueSceneSynchronization);
Hooks.on("updateScene", (scene, changes, options) => {
  if (scene.id !== getActiveScene()?.id) return;
  if (options?.sceneLightkeeper || changes.environment || changes.fog || Object.hasOwn(changes, "tokenVision") || changes.flags?.[MODULE_ID]) {
    refreshApps();
  }
});
