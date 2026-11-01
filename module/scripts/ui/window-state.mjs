// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../constants.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

export function loadWindowState(settingKey, fallback = {}) {
  let stored = {};
  try {
    stored = game.settings.get(MODULE_ID, settingKey) ?? {};
  } catch (_error) {
    stored = {};
  }
  const viewportWidth = globalThis.innerWidth || 1920;
  const viewportHeight = globalThis.innerHeight || 1080;
  const width = clamp(stored.width ?? fallback.width ?? 640, 320, Math.max(320, viewportWidth - 24));
  const height = clamp(stored.height ?? fallback.height ?? 620, 220, Math.max(220, viewportHeight - 24));
  const left = clamp(stored.left ?? fallback.left ?? Math.max(12, (viewportWidth - width) / 2), 0, Math.max(0, viewportWidth - 80));
  const top = clamp(stored.top ?? fallback.top ?? Math.max(12, (viewportHeight - height) / 2), 0, Math.max(0, viewportHeight - 48));
  return { width, height, left, top };
}

export async function saveWindowState(settingKey, position = {}) {
  const safe = {};
  for (const key of ["width", "height", "left", "top"]) {
    const value = Number(position[key]);
    if (Number.isFinite(value)) safe[key] = Math.round(value);
  }
  if (!Object.keys(safe).length) return;
  try {
    await game.settings.set(MODULE_ID, settingKey, safe);
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not persist window state`, error);
  }
}

export async function clearWindowStates(keys) {
  await Promise.all(keys.map((key) => game.settings.set(MODULE_ID, key, {})));
}
