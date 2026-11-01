// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "../constants.mjs";
import { getActiveScene, resetFog } from "../scene-service.mjs";

export async function requestFogReset(scene = getActiveScene()) {
  if (game.settings.get(MODULE_ID, SETTINGS.CONFIRM_FOG_RESET)) {
    const { DialogV2 } = foundry.applications.api;
    const confirmed = await DialogV2.confirm({
      window: { title: game.i18n.localize("SLK.Fog.ResetTitle") },
      content: `<div class="slk-dialog slk-danger-dialog"><p><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ${game.i18n.localize("SLK.Fog.ResetConfirm")}</p></div>`,
      yes: { label: game.i18n.localize("SLK.Common.Reset"), icon: "fa-solid fa-eraser" },
      no: { label: game.i18n.localize("SLK.Common.Cancel") },
      modal: true,
      rejectClose: false
    });
    if (!confirmed) return false;
  }
  await resetFog(scene);
  return true;
}
