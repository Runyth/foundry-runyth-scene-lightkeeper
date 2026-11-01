// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  CONTROL_CHANGE_BEHAVIORS,
  MODE_SWITCH_BEHAVIORS,
  MODULE_ID,
  MODES,
  MOON_PHASES,
  SETTINGS
} from "../constants.mjs";
import { descriptiveBand } from "../astronomy.mjs";
import { computeDarkness, mergeStatePatch } from "../state.mjs";
import {
  calculationOptions,
  getActiveScene,
  getSceneState,
  patchAndApplySceneState,
  setDarknessLock,
  setFogExploration,
  setTokenVision
} from "../scene-service.mjs";
import { buildSceneContext } from "../ui/context.mjs";
import { requestFogReset } from "../ui/fog-reset.mjs";
import { showHowToGuide } from "../ui/how-to.mjs";
import { reportUiError, runUiAction } from "../ui/action-runner.mjs";
import { loadWindowState, saveWindowState } from "../ui/window-state.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function numericValue(target) {
  return Number(target?.value ?? 0);
}

function hasKeys(value) {
  return Boolean(value && Object.keys(value).length);
}

async function renderIfOpen(app) {
  if (!app?.rendered) return;
  await app.render({ force: false });
}

export class ControlPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "runyth-scene-lightkeeper-control-panel",
    classes: ["slk-app", "slk-control-panel"],
    tag: "section",
    window: {
      title: "SLK.Panel.Title",
      icon: "fa-solid fa-sun",
      resizable: true
    },
    position: { width: 720, height: 720 },
    actions: {
      switchMode: ControlPanel.onSwitchMode,
      applyScheme: ControlPanel.onApplyScheme,
      discardChanges: ControlPanel.onDiscardChanges,
      applyPreset: ControlPanel.onApplyPreset,
      toggleFog: ControlPanel.onToggleFog,
      toggleVision: ControlPanel.onToggleVision,
      toggleLock: ControlPanel.onToggleLock,
      resetFog: ControlPanel.onResetFog,
      openGuide: ControlPanel.onOpenGuide,
      openSettings: ControlPanel.onOpenSettings,
      toggleFloating: ControlPanel.onToggleFloating
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/control-panel.hbs` }
  };

  constructor(options = {}) {
    super({
      ...options,
      position: {
        ...loadWindowState(SETTINGS.PANEL_STATE, { width: 720, height: 720 }),
        ...(options.position ?? {})
      }
    });
    this._saveTimer = null;
    this._applying = false;
    this._ignorePositionSave = false;
    this._sceneId = null;
    this._viewMode = null;
    this._draftPatch = {};
  }

  resetDraft(scene = getActiveScene()) {
    this._sceneId = scene?.id ?? null;
    this._viewMode = null;
    this._draftPatch = {};
  }

  ensureSceneDraft(scene = getActiveScene()) {
    const id = scene?.id ?? null;
    if (this._sceneId !== id) this.resetDraft(scene);
  }

  hasPendingChanges(scene = getActiveScene()) {
    this.ensureSceneDraft(scene);
    const current = getSceneState(scene);
    return hasKeys(this._draftPatch) || (this._viewMode != null && this._viewMode !== current.mode);
  }

  stagePatch(patch) {
    this._draftPatch = mergeStatePatch(this._draftPatch, patch);
    if (patch.mode) this._viewMode = patch.mode;
  }

  draftState(scene = getActiveScene()) {
    const current = getSceneState(scene);
    const state = mergeStatePatch(current, this._draftPatch);
    return { ...state, mode: this._viewMode ?? state.mode };
  }

  async _prepareContext(options) {
    const scene = getActiveScene();
    this.ensureSceneDraft(scene);
    const pending = this.hasPendingChanges(scene);
    const context = buildSceneContext({
      stateOverride: this._draftPatch,
      modeOverride: this._viewMode,
      hasPendingChanges: pending
    });
    return {
      ...(await super._prepareContext(options)),
      ...context,
      showApplyControls: pending || context.controlChangesRequireApply,
      canApplyChanges: pending && context.canManage,
      pendingHint: context.controlChangesRequireApply
        ? game.i18n.localize("SLK.Apply.PendingControls")
        : game.i18n.localize("SLK.Apply.PendingMode")
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element?.querySelectorAll("input[data-slk-field], select[data-slk-field]").forEach((input) => {
      input.addEventListener("input", (event) => this.onInput(event));
      input.addEventListener("change", (event) => void this.onChange(event));
    });
  }

  _onPosition(position) {
    super._onPosition(position);
    if (this._ignorePositionSave) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => void saveWindowState(SETTINGS.PANEL_STATE, position), 250);
  }

  _onClose(options) {
    clearTimeout(this._saveTimer);
    void saveWindowState(SETTINGS.PANEL_STATE, this.position);
    super._onClose(options);
  }

  controlChangesRequireApply() {
    return game.settings.get(MODULE_ID, SETTINGS.CONTROL_CHANGE_BEHAVIOR) === CONTROL_CHANGE_BEHAVIORS.APPLY;
  }

  modeSwitchRequiresApply() {
    return game.settings.get(MODULE_ID, SETTINGS.MODE_SWITCH_BEHAVIOR) !== MODE_SWITCH_BEHAVIORS.IMMEDIATE;
  }

  onInput(event) {
    const target = event.currentTarget;
    const output = this.element?.querySelector(`[data-slk-output="${target.dataset.slkField}"]`);
    if (output) output.textContent = this.formatOutput(target);

    const patch = this.patchFromInput(target);
    if (this.controlChangesRequireApply()) {
      this.stagePatch(patch);
      this.updatePendingDom();
      return;
    }

    if (!game.settings.get(MODULE_ID, SETTINGS.LIVE_PREVIEW)) return;
    const scene = getActiveScene();
    if (!scene || typeof canvas?.environment?.animateDarkness !== "function") return;
    const state = mergeStatePatch(getSceneState(scene), patch);
    const darkness = computeDarkness(state, calculationOptions());
    this.updateDarknessDom(darkness);
    void Promise.resolve().then(() => canvas.environment.animateDarkness(darkness, { duration: 150 })).catch(() => {});
  }

  async onChange(event) {
    const target = event.currentTarget;
    if (this._applying) return;
    const patch = this.patchFromInput(target);
    if (this.controlChangesRequireApply()) {
      this.stagePatch(patch);
      await renderIfOpen(this);
      return;
    }

    this._applying = true;
    try {
      await patchAndApplySceneState(patch, { notify: false, source: "control-panel" });
      this._draftPatch = {};
      this._sceneId = getActiveScene()?.id ?? null;
      if (patch.mode) this._viewMode = null;
      await renderIfOpen(this);
    } catch (error) {
      reportUiError("Control panel input", error);
    } finally {
      this._applying = false;
    }
  }

  updatePendingDom() {
    const apply = this.element?.querySelector('[data-action="applyScheme"]');
    if (apply) apply.disabled = false;
    this.element?.querySelector(".slk-apply-row")?.classList.add("pending");
    const darkness = computeDarkness(this.draftState(), calculationOptions());
    this.updateDarknessDom(darkness);
  }

  updateDarknessDom(darkness) {
    const percent = Math.round(darkness * 100);
    const meter = this.element?.querySelector(".slk-darkness-meter strong");
    const band = this.element?.querySelector(".slk-darkness-meter span");
    if (meter) meter.textContent = `${percent}%`;
    if (band) band.textContent = game.i18n.localize(`SLK.Band.${descriptiveBand(darkness)}`);
  }

  stateFromInput(target) {
    return mergeStatePatch(this.draftState(), this.patchFromInput(target));
  }

  patchFromInput(target) {
    const field = target.dataset.slkField;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const numeric = [
      "feel",
      "phase",
      "clockMinutes",
      "imperialBell",
      "moonIndex",
      "naturalLightCutoff",
      "transitionSeconds",
      "ordinaryYear",
      "ordinaryMonth",
      "ordinaryDay",
      "imperialYear",
      "imperialMonth",
      "imperialDay"
    ].includes(field) ? numericValue(target) : value;
    if (field === "ordinaryYear") return { ordinaryDate: { year: numeric } };
    if (field === "ordinaryMonth") return { ordinaryDate: { month: numeric } };
    if (field === "ordinaryDay") return { ordinaryDate: { day: numeric } };
    if (field === "imperialYear") return { imperialDate: { year: numeric } };
    if (field === "imperialMonth") return { imperialDate: { month: numeric } };
    if (field === "imperialDay") return { imperialDate: { day: numeric } };
    const mode = ["feel", "phase", "clockMinutes", "imperialBell"].includes(field)
      ? ({ feel: MODES.FEEL, phase: MODES.PHASE, clockMinutes: MODES.CLOCK, imperialBell: MODES.IMPERIAL }[field])
      : undefined;
    return { [field]: numeric, ...(mode ? { mode } : {}) };
  }

  formatMinutes(value) {
    const safe = Math.max(0, Math.min(1439, Math.round(value)));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  formatOutput(target) {
    const value = numericValue(target);
    if (target.dataset.format === "clock") return this.formatMinutes(value);
    if (target.dataset.format === "moon") {
      const index = Math.max(0, Math.min(MOON_PHASES.length - 1, Math.round(value)));
      const id = MOON_PHASES[index].id;
      return game.i18n.localize(`SLK.Moon.${id[0].toUpperCase()}${id.slice(1)}`);
    }
    return String(Math.round(value));
  }

  resetLayout() {
    clearTimeout(this._saveTimer);
    this._ignorePositionSave = true;
    this.setPosition(loadWindowState(SETTINGS.PANEL_STATE, { width: 720, height: 720 }));
    this._ignorePositionSave = false;
  }

  static onSwitchMode(event, target) {
    event.preventDefault();
    return runUiAction("Control panel mode", async () => {
      const mode = target.dataset.mode;
      this._viewMode = mode;
      if (this.modeSwitchRequiresApply()) {
        await renderIfOpen(this);
        return;
      }
      await patchAndApplySceneState({ mode }, { notify: false, source: "mode" });
      this.resetDraft();
      await renderIfOpen(this);
    });
  }

  static onApplyScheme(event) {
    event.preventDefault();
    return runUiAction("Control panel apply", async () => {
      const scene = getActiveScene();
      const current = getSceneState(scene);
      const patch = mergeStatePatch(this._draftPatch, { mode: this._viewMode ?? current.mode });
      await patchAndApplySceneState(patch, { source: "apply-button" });
      this.resetDraft(scene);
      await renderIfOpen(this);
    });
  }

  static onDiscardChanges(event) {
    event.preventDefault();
    return runUiAction("Control panel discard", async () => {
      this.resetDraft();
      await renderIfOpen(this);
    });
  }

  static onApplyPreset(event, target) {
    event.preventDefault();
    const feel = Number(target.dataset.feel);
    return runUiAction("Control panel preset", async () => {
      await patchAndApplySceneState({ mode: MODES.FEEL, feel }, { source: "preset" });
      this.resetDraft();
      await renderIfOpen(this);
    });
  }

  static onToggleFog(event) {
    event.preventDefault();
    return runUiAction("Control panel fog exploration", async () => {
      const scene = getActiveScene();
      await setFogExploration(!scene?.fog?.exploration, scene);
      await renderIfOpen(this);
    });
  }

  static onToggleVision(event) {
    event.preventDefault();
    return runUiAction("Control panel token vision", async () => {
      const scene = getActiveScene();
      await setTokenVision(!scene?.tokenVision, scene);
      await renderIfOpen(this);
    });
  }

  static onToggleLock(event) {
    event.preventDefault();
    return runUiAction("Control panel darkness lock", async () => {
      const scene = getActiveScene();
      await setDarknessLock(!scene?.environment?.darknessLevelLock, scene);
      await renderIfOpen(this);
    });
  }

  static onResetFog(event) {
    event.preventDefault();
    return runUiAction("Control panel fog reset", async () => {
      await requestFogReset();
      await renderIfOpen(this);
    });
  }

  static onOpenGuide(event) {
    event.preventDefault();
    return runUiAction("Control panel guide", () => showHowToGuide());
  }

  static onOpenSettings(event) {
    event.preventDefault();
    return runUiAction("Control panel settings", () => globalThis.SceneLightkeeper?.openSettings?.());
  }

  static onToggleFloating(event) {
    event.preventDefault();
    return runUiAction("Control panel floating board", () => globalThis.SceneLightkeeper?.toggleFloating?.());
  }
}
