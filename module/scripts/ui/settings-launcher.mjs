// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS, SETTINGS_LAUNCHER_SIZES } from "../constants.mjs";
import { runUiAction } from "./action-runner.mjs";

export const SETTINGS_LAUNCHER_ID = `${MODULE_ID}-settings-launcher`;

function resolveRoot(application, rendered) {
  if (rendered instanceof globalThis.HTMLElement) return rendered;
  if (rendered?.[0] instanceof globalThis.HTMLElement) return rendered[0];
  if (application?.element instanceof globalThis.HTMLElement) return application.element;
  return null;
}

function makeIcon(className) {
  const icon = document.createElement("i");
  icon.className = className;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function makeButton({ action, icon, label, title }) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.slkLauncherAction = action;
  button.title = title;
  button.setAttribute("aria-label", title);

  const text = document.createElement("span");
  text.className = "slk-settings-launcher-label";
  text.textContent = label;
  button.append(makeIcon(icon), text);
  return button;
}

function bind(button, label, callback) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    void runUiAction(label, callback);
  });
}

export function renderSettingsLauncher(application, rendered) {
  if (!game.user?.isGM || typeof globalThis.HTMLElement !== "function") return;
  const root = resolveRoot(application, rendered);
  if (!root || root.querySelector(`#${SETTINGS_LAUNCHER_ID}`)) return;

  const launcherSize = game.settings?.get?.(MODULE_ID, SETTINGS.SETTINGS_LAUNCHER_SIZE) ?? SETTINGS_LAUNCHER_SIZES.STANDARD;

  const section = document.createElement("section");
  section.id = SETTINGS_LAUNCHER_ID;
  section.className = `slk-settings-launcher${launcherSize === SETTINGS_LAUNCHER_SIZES.COMPACT ? " compact" : ""}`;
  section.setAttribute("aria-label", game.i18n.localize("SLK.SettingsLauncher.Title"));

  const heading = document.createElement("h3");
  const headingText = document.createElement("span");
  headingText.textContent = game.i18n.localize("SLK.SettingsLauncher.Title");
  heading.append(makeIcon("fa-solid fa-sun"), headingText);

  const hint = document.createElement("p");
  hint.textContent = game.i18n.localize("SLK.SettingsLauncher.Hint");

  const actions = document.createElement("div");
  const open = makeButton({
    action: "open",
    icon: "fa-solid fa-sliders",
    label: game.i18n.localize("SLK.SettingsLauncher.OpenShort"),
    title: game.i18n.localize("SLK.SettingsLauncher.Open")
  });
  const floating = makeButton({
    action: "floating",
    icon: "fa-solid fa-thumbtack",
    label: game.i18n.localize("SLK.SettingsLauncher.FloatingShort"),
    title: game.i18n.localize("SLK.SettingsLauncher.Floating")
  });
  actions.append(open, floating);
  section.append(heading, hint, actions);

  bind(open, "Settings sidebar launcher", () => globalThis.SceneLightkeeper?.open?.());
  bind(floating, "Settings sidebar floating board", () => globalThis.SceneLightkeeper?.toggleFloating?.(true));

  const target = root.querySelector(".settings-buttons")
    ?? root.querySelector("[data-tab='settings']")
    ?? root.querySelector(".scrollable")
    ?? root;
  target.prepend(section);
}
