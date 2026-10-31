// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function showHowToGuide() {
  const { DialogV2 } = foundry.applications.api;
  return DialogV2.wait({
    window: {
      title: game.i18n.localize("SLK.Guide.Title"),
      icon: "fa-solid fa-circle-question"
    },
    content: `<div class="slk-dialog slk-guide-dialog">
      <p class="slk-guide-lead">${game.i18n.localize("SLK.Guide.Lead")}</p>
      <ol>
        <li><i class="fa-solid fa-sun" aria-hidden="true"></i><span>${game.i18n.localize("SLK.Guide.StepOpen")}</span></li>
        <li><i class="fa-solid fa-hand-pointer" aria-hidden="true"></i><span>${game.i18n.localize("SLK.Guide.StepChoose")}</span></li>
        <li><i class="fa-solid fa-sliders" aria-hidden="true"></i><span>${game.i18n.localize("SLK.Guide.StepAdjust")}</span></li>
        <li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${game.i18n.localize("SLK.Guide.StepApply")}</span></li>
        <li><i class="fa-solid fa-cloud" aria-hidden="true"></i><span>${game.i18n.localize("SLK.Guide.StepFog")}</span></li>
      </ol>
      <p class="slk-guide-note">${game.i18n.localize("SLK.Guide.Note")}</p>
    </div>`,
    buttons: [{
      action: "close",
      label: game.i18n.localize("SLK.Guide.Understood"),
      icon: "fa-solid fa-check",
      default: true
    }],
    modal: false,
    rejectClose: false
  });
}
