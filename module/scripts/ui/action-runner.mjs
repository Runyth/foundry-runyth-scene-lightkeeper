// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../constants.mjs";

export function reportUiError(context, error) {
  console.error(`${MODULE_ID} | ${context}`, error);
  const fallback = globalThis.game?.i18n?.localize?.("SLK.Error.Generic") ?? "Scene Lightkeeper encountered an error.";
  globalThis.ui?.notifications?.error?.(error?.message ?? fallback);
}

export async function runUiAction(context, action) {
  try {
    return await action();
  } catch (error) {
    reportUiError(context, error);
    return undefined;
  }
}
