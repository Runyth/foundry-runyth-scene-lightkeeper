// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODES, MODULE_ID } from "./constants.mjs";

const systems = new Map();
const DEFAULT_MODES = Object.freeze([MODES.PHASE, MODES.CLOCK, MODES.IMPERIAL]);

function normalizeModes(modes) {
  const candidates = Array.isArray(modes) ? modes : DEFAULT_MODES;
  const valid = candidates.filter((mode) => Object.values(MODES).includes(mode) && mode !== MODES.FEEL);
  return [...new Set(valid)];
}

function normalizeLabel(definition, id) {
  if (definition.labelKey != null && String(definition.labelKey).trim() !== "") {
    return { label: null, labelKey: String(definition.labelKey).trim() };
  }
  if (definition.label != null && (typeof definition.label === "function" || String(definition.label).trim() !== "")) {
    return { label: definition.label, labelKey: null };
  }
  throw new TypeError(`Time system '${id}' requires label or labelKey.`);
}

function validateDefinition(definition) {
  if (!definition || typeof definition !== "object") throw new TypeError("A time-system definition is required.");
  const id = String(definition.id ?? "").trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) throw new TypeError("Time-system id must use letters, numbers, dots, underscores, or hyphens.");
  if (typeof definition.format !== "function") throw new TypeError(`Time system '${id}' requires a synchronous format function.`);
  const labels = normalizeLabel(definition, id);
  return {
    id,
    ...labels,
    modes: normalizeModes(definition.modes),
    order: Number.isFinite(Number(definition.order)) ? Number(definition.order) : 100,
    format: definition.format
  };
}

export function registerTimeSystem(definition) {
  const normalized = validateDefinition(definition);
  if (systems.has(normalized.id)) throw new Error(`Time system '${normalized.id}' is already registered.`);
  systems.set(normalized.id, normalized);
  return () => systems.delete(normalized.id);
}

export function unregisterTimeSystem(id) {
  return systems.delete(String(id));
}

export function listTimeSystems() {
  return [...systems.values()]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map(({ id, label, labelKey, modes, order }) => ({ id, label, labelKey, modes: [...modes], order }));
}

function resolveLabel(system, localize) {
  if (system.labelKey) return String(localize(system.labelKey));
  if (typeof system.label === "function") return String(system.label({ localize }));
  return String(system.label);
}

function isThenable(value) {
  return value != null && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
}

export function getTimeSystemDisplays({
  minutes,
  mode,
  state,
  scene,
  approximate = false,
  localize = (key) => globalThis.game?.i18n?.localize?.(key) ?? key
} = {}) {
  const output = [];
  for (const system of [...systems.values()].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))) {
    if (!system.modes.includes(mode)) continue;
    try {
      const value = system.format({ minutes, mode, state, scene, approximate, localize });
      if (isThenable(value)) throw new TypeError("Time-system formatters must return synchronously.");
      if (value == null || value === "") continue;
      output.push({
        id: system.id,
        label: resolveLabel(system, localize),
        value: String(value)
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Time system '${system.id}' could not format the current time`, error);
    }
  }
  return output;
}

export function clearTimeSystemsForTests() {
  systems.clear();
}
