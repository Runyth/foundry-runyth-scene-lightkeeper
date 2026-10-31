// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  LIGHTING_SNAPSHOT_SCHEMA,
  MODES,
  MODULE_ID,
  SCENE_SYNC_MODES,
  SETTINGS
} from "./constants.mjs";
import { computeDarkness, normalizeState } from "./state.mjs";
import { clamp } from "./astronomy.mjs";

const PROFILE_FIELDS = Object.freeze([
  "mode",
  "feel",
  "phase",
  "clockMinutes",
  "imperialBell",
  "moonIndex",
  "season",
  "seasonMode",
  "lightMode",
  "naturalLightCutoff",
  "transitionSeconds"
]);

function setting(key, fallback) {
  try {
    const value = game.settings.get(MODULE_ID, key);
    return value ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sameNumber(left, right, epsilon = 0.000001) {
  return Math.abs(finiteNumber(left) - finiteNumber(right)) <= epsilon;
}

function plainClone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

export function getActiveScene() {
  return canvas?.scene ?? game?.scenes?.active ?? null;
}

export function sceneDefaults() {
  return {
    season: setting(SETTINGS.DEFAULT_SEASON, "spring"),
    seasonMode: setting(SETTINGS.DEFAULT_SEASON_MODE, setting(SETTINGS.DERIVE_SEASON_FROM_IMPERIAL_MONTH, false) ? "calendar" : "manual"),
    lightMode: setting(SETTINGS.DEFAULT_LIGHT_MODE, "automatic"),
    naturalLightCutoff: setting(SETTINGS.DEFAULT_NATURAL_LIGHT_CUTOFF, 72)
  };
}

export function calculationOptions() {
  return {
    seasonalEnabled: setting(SETTINGS.SEASONAL_ENABLED, true),
    defaultSeason: setting(SETTINGS.DEFAULT_SEASON, "spring")
  };
}

export function getSceneState(scene = getActiveScene()) {
  const stored = scene?.getFlag?.(MODULE_ID, "state") ?? {};
  return normalizeState(stored, sceneDefaults());
}

export function canManageScene(scene = getActiveScene()) {
  if (!scene || !game?.user) return false;
  return Boolean(game.user.isGM || scene.canUserModify?.(game.user, "update"));
}

function globalLightChanges(state) {
  const threshold = clamp(state.naturalLightCutoff, 1, 100) / 100;
  switch (state.lightMode) {
    case "automatic":
      return {
        "environment.globalLight.enabled": 1,
        "environment.globalLight.darkness.min": 0,
        "environment.globalLight.darkness.max": threshold
      };
    case "always":
      return {
        "environment.globalLight.enabled": 1,
        "environment.globalLight.darkness.min": 0,
        "environment.globalLight.darkness.max": 1
      };
    case "off":
      return { "environment.globalLight.enabled": 0 };
    case "preserve":
    default:
      return {};
  }
}

function normalizeGlobalLight(input = {}, fallback = {}) {
  const fallbackDarkness = fallback?.darkness ?? {};
  const darkness = input?.darkness ?? {};
  return {
    enabled: Number(Boolean(input?.enabled ?? fallback?.enabled ?? false)),
    darkness: {
      min: clamp(finiteNumber(darkness.min, finiteNumber(fallbackDarkness.min, 0)), 0, 1),
      max: clamp(finiteNumber(darkness.max, finiteNumber(fallbackDarkness.max, 1)), 0, 1)
    }
  };
}

export function captureGlobalLight(scene = getActiveScene()) {
  return normalizeGlobalLight(scene?.environment?.globalLight);
}

function globalLightOverrideChanges(globalLight) {
  const normalized = normalizeGlobalLight(globalLight);
  return {
    "environment.globalLight.enabled": normalized.enabled,
    "environment.globalLight.darkness.min": normalized.darkness.min,
    "environment.globalLight.darkness.max": normalized.darkness.max
  };
}

function resultingGlobalLight(scene, state, override) {
  if (override) return normalizeGlobalLight(override, captureGlobalLight(scene));
  const current = captureGlobalLight(scene);
  const changes = globalLightChanges(state);
  return normalizeGlobalLight({
    enabled: changes["environment.globalLight.enabled"] ?? current.enabled,
    darkness: {
      min: changes["environment.globalLight.darkness.min"] ?? current.darkness.min,
      max: changes["environment.globalLight.darkness.max"] ?? current.darkness.max
    }
  }, current);
}

export function captureLightingSnapshot(scene = getActiveScene(), state = getSceneState(scene), overrides = {}) {
  if (!scene) return null;
  const normalized = normalizeState(state, sceneDefaults());
  const computed = computeDarkness(normalized, calculationOptions());
  const darknessLevel = clamp(finiteNumber(
    overrides.darknessLevel,
    finiteNumber(scene?.environment?.darknessLevel, computed)
  ), 0, 1);
  return {
    schema: LIGHTING_SNAPSHOT_SCHEMA,
    state: normalized,
    darknessLevel,
    globalLight: normalizeGlobalLight(overrides.globalLight ?? captureGlobalLight(scene)),
    sourceSceneId: scene.id ?? null,
    updatedAt: Date.now(),
    updatedBy: game?.user?.id ?? null
  };
}

function normalizeLightingSnapshot(input) {
  if (!input || typeof input !== "object" || !input.state) return null;
  return {
    schema: LIGHTING_SNAPSHOT_SCHEMA,
    state: normalizeState(input.state, sceneDefaults()),
    darknessLevel: clamp(finiteNumber(input.darknessLevel, input.state.lastAppliedDarkness), 0, 1),
    globalLight: normalizeGlobalLight(input.globalLight),
    sourceSceneId: typeof input.sourceSceneId === "string" ? input.sourceSceneId : null,
    updatedAt: finiteNumber(input.updatedAt, 0),
    updatedBy: typeof input.updatedBy === "string" ? input.updatedBy : null
  };
}

export function getCurrentLightingSnapshot() {
  return normalizeLightingSnapshot(setting(SETTINGS.CURRENT_LIGHTING_SNAPSHOT, {}));
}

export async function rememberLightingSnapshot(scene = getActiveScene(), state = getSceneState(scene), overrides = {}) {
  if (!scene || !game?.user?.isGM || typeof game.settings?.set !== "function") return null;
  const snapshot = captureLightingSnapshot(scene, state, overrides);
  if (!snapshot) return null;
  try {
    await game.settings.set(MODULE_ID, SETTINGS.CURRENT_LIGHTING_SNAPSHOT, snapshot);
    return snapshot;
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not remember the current lighting profile`, error);
    return null;
  }
}

export async function captureCurrentLighting(scene = getActiveScene()) {
  if (!scene) throw new Error(game.i18n.localize("SLK.Error.NoScene"));
  if (!canManageScene(scene)) throw new Error(game.i18n.localize("SLK.Error.Permission"));
  return rememberLightingSnapshot(scene, getSceneState(scene));
}

export async function applySceneState(scene, nextState, {
  notify = true,
  source = "ui",
  rememberCurrent,
  darknessOverride,
  globalLightOverride
} = {}) {
  if (!scene) throw new Error(game.i18n.localize("SLK.Error.NoScene"));
  if (!canManageScene(scene)) throw new Error(game.i18n.localize("SLK.Error.Permission"));

  const normalized = normalizeState(nextState, sceneDefaults());
  const calculatedDarkness = computeDarkness(normalized, calculationOptions());
  const darkness = clamp(finiteNumber(darknessOverride, calculatedDarkness), 0, 1);
  const persisted = {
    ...normalized,
    lastAppliedDarkness: darkness,
    updatedAt: Date.now(),
    updatedBy: game.user.id
  };
  const resolvedGlobalLight = resultingGlobalLight(scene, persisted, globalLightOverride);
  const changes = {
    [`flags.${MODULE_ID}.state`]: persisted,
    "environment.darknessLevel": darkness,
    ...(globalLightOverride ? globalLightOverrideChanges(resolvedGlobalLight) : globalLightChanges(persisted))
  };
  await scene.update(changes, {
    sceneLightkeeper: true,
    sceneLightkeeperSource: source,
    animateDarkness: Math.round(persisted.transitionSeconds * 1000)
  });

  const shouldRemember = rememberCurrent ?? scene.id === getActiveScene()?.id;
  if (shouldRemember) {
    await rememberLightingSnapshot(scene, persisted, {
      darknessLevel: darkness,
      globalLight: resolvedGlobalLight
    });
  }

  if (notify) {
    ui.notifications.info(game.i18n.format("SLK.Notification.Applied", {
      percent: Math.round(darkness * 100),
      scene: scene.name
    }));
  }
  return persisted;
}

export async function patchAndApplySceneState(patch, options = {}) {
  const scene = options.scene ?? getActiveScene();
  const current = getSceneState(scene);
  return applySceneState(scene, {
    ...current,
    ...patch,
    ordinaryDate: {
      ...current.ordinaryDate,
      ...(patch.ordinaryDate ?? {})
    },
    imperialDate: {
      ...current.imperialDate,
      ...(patch.imperialDate ?? {})
    }
  }, options);
}

function profileState(snapshotState, destinationState) {
  const next = { ...destinationState };
  for (const field of PROFILE_FIELDS) next[field] = plainClone(snapshotState[field]);
  next.ordinaryDate = plainClone(snapshotState.ordinaryDate);
  next.imperialDate = plainClone(snapshotState.imperialDate);
  return next;
}

function gradeState(snapshot, destinationState) {
  return {
    ...destinationState,
    mode: MODES.FEEL,
    feel: Math.round(snapshot.darknessLevel * 100),
    lightMode: snapshot.state.lightMode,
    naturalLightCutoff: snapshot.state.naturalLightCutoff,
    transitionSeconds: snapshot.state.transitionSeconds
  };
}

function statesMatch(left, right, mode) {
  const fields = mode === SCENE_SYNC_MODES.PROFILE
    ? PROFILE_FIELDS
    : ["mode", "feel", "lightMode", "naturalLightCutoff", "transitionSeconds"];
  for (const field of fields) {
    if (left[field] !== right[field]) return false;
  }
  if (mode === SCENE_SYNC_MODES.PROFILE) {
    for (const dateKey of ["ordinaryDate", "imperialDate"]) {
      for (const field of ["year", "month", "day"]) {
        if (left[dateKey]?.[field] !== right[dateKey]?.[field]) return false;
      }
    }
  }
  return true;
}

function globalLightsMatch(left, right) {
  return Number(Boolean(left?.enabled)) === Number(Boolean(right?.enabled))
    && sameNumber(left?.darkness?.min, right?.darkness?.min)
    && sameNumber(left?.darkness?.max, right?.darkness?.max);
}

export async function syncLightingToScene(scene, {
  mode = setting(SETTINGS.SCENE_SYNC_MODE, SCENE_SYNC_MODES.OFF),
  snapshot: suppliedSnapshot = null,
  sourceScene = null,
  notify = false,
  source = "scene-switch"
} = {}) {
  if (!scene) throw new Error(game.i18n.localize("SLK.Error.NoScene"));
  if (mode === SCENE_SYNC_MODES.OFF) return { applied: false, reason: "disabled" };
  if (!Object.values(SCENE_SYNC_MODES).includes(mode)) return { applied: false, reason: "invalid-mode" };
  if (!canManageScene(scene)) throw new Error(game.i18n.localize("SLK.Error.Permission"));

  const snapshot = normalizeLightingSnapshot(suppliedSnapshot)
    ?? (sourceScene ? captureLightingSnapshot(sourceScene, getSceneState(sourceScene)) : null)
    ?? getCurrentLightingSnapshot();
  if (!snapshot) return { applied: false, reason: "no-snapshot" };

  const current = getSceneState(scene);
  const next = mode === SCENE_SYNC_MODES.PROFILE
    ? profileState(snapshot.state, current)
    : gradeState(snapshot, current);
  const normalized = normalizeState(next, sceneDefaults());
  const targetDarkness = mode === SCENE_SYNC_MODES.GRADE
    ? snapshot.darknessLevel
    : computeDarkness(normalized, calculationOptions());
  const targetGlobalLight = normalizeGlobalLight(snapshot.globalLight);
  const currentGlobalLight = captureGlobalLight(scene);
  const currentDarkness = finiteNumber(scene?.environment?.darknessLevel, current.lastAppliedDarkness);

  if (statesMatch(current, normalized, mode)
    && sameNumber(currentDarkness, targetDarkness)
    && globalLightsMatch(currentGlobalLight, targetGlobalLight)) {
    await rememberLightingSnapshot(scene, current, {
      darknessLevel: currentDarkness,
      globalLight: currentGlobalLight
    });
    return { applied: false, reason: "already-matched", state: current };
  }

  const state = await applySceneState(scene, normalized, {
    notify,
    source,
    rememberCurrent: true,
    darknessOverride: mode === SCENE_SYNC_MODES.GRADE ? snapshot.darknessLevel : undefined,
    globalLightOverride: targetGlobalLight
  });
  return { applied: true, reason: "synchronized", state, snapshot };
}

export async function setDarknessLock(enabled, scene = getActiveScene()) {
  if (!scene) throw new Error(game.i18n.localize("SLK.Error.NoScene"));
  if (!canManageScene(scene)) throw new Error(game.i18n.localize("SLK.Error.Permission"));
  await scene.update({ "environment.darknessLevelLock": Boolean(enabled) }, { sceneLightkeeper: true });
  return Boolean(enabled);
}

export async function setFogExploration(enabled, scene = getActiveScene()) {
  if (!scene) throw new Error(game.i18n.localize("SLK.Error.NoScene"));
  if (!canManageScene(scene)) throw new Error(game.i18n.localize("SLK.Error.Permission"));
  await scene.update({ "fog.exploration": Boolean(enabled) }, { sceneLightkeeper: true });
  return Boolean(enabled);
}

export async function setTokenVision(enabled, scene = getActiveScene()) {
  if (!scene) throw new Error(game.i18n.localize("SLK.Error.NoScene"));
  if (!canManageScene(scene)) throw new Error(game.i18n.localize("SLK.Error.Permission"));
  await scene.update({ tokenVision: Boolean(enabled) }, { sceneLightkeeper: true });
  return Boolean(enabled);
}

export async function resetFog(scene = getActiveScene()) {
  if (!scene) throw new Error(game.i18n.localize("SLK.Error.NoScene"));
  if (!game.user.isGM) throw new Error(game.i18n.localize("SLK.Error.Permission"));
  if (canvas?.scene?.id !== scene.id || typeof canvas?.fog?.reset !== "function") {
    throw new Error(game.i18n.localize("SLK.Error.FogActiveScene"));
  }
  await canvas.fog.reset();
  ui.notifications.info(game.i18n.format("SLK.Notification.FogReset", { scene: scene.name }));
}
