// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  CONTROL_CHANGE_BEHAVIORS,
  MODULE_ID,
  MODES,
  MOON_PHASES,
  SETTINGS
} from "../constants.mjs";
import { computeDarkness, mergeStatePatch } from "../state.mjs";
import { calculationOptions, getActiveScene, getSceneState, patchAndApplySceneState } from "../scene-service.mjs";
import { buildSceneContext } from "../ui/context.mjs";
import { showHowToGuide } from "../ui/how-to.mjs";
import { reportUiError, runUiAction } from "../ui/action-runner.mjs";
import { loadWindowState, saveWindowState } from "../ui/window-state.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

async function renderIfOpen(app) {
  if (!app?.rendered) return;
  await app.render({ force: false });
}

function hasKeys(value) {
  return Boolean(value && Object.keys(value).length);
}

export class FloatingBoard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "runyth-scene-lightkeeper-floating-board",
    classes: ["slk-app", "slk-floating-board"],
    tag: "aside",
    window: {
      title: "SLK.Floating.Title",
      icon: "fa-solid fa-cloud-moon",
      resizable: true,
      minimizable: false
    },
    position: { width: 380, height: 620 },
    actions: {
      openPanel: FloatingBoard.onOpenPanel,
      openGuide: FloatingBoard.onOpenGuide,
      closeBoard: FloatingBoard.onCloseBoard,
      applyChanges: FloatingBoard.onApplyChanges,
      discardChanges: FloatingBoard.onDiscardChanges
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/floating-board.hbs` }
  };

  constructor(options = {}) {
    super({
      ...options,
      position: {
        ...loadWindowState(SETTINGS.FLOATING_STATE, { width: 380, height: 620, left: 24, top: 160 }),
        ...(options.position ?? {})
      }
    });
    this._saveTimer = null;
    this._busy = false;
    this._ignorePositionSave = false;
    this._sceneId = null;
    this._draftPatch = {};
    this._stickyDesired = false;
    this._explicitClose = false;
    this._restoreTimer = null;
    this._observer = null;
    this._guardStarted = false;
    this._visibilityHandler = null;
    this._focusHandler = null;
  }


  async render(options = {}, legacyOptions = {}) {
    this._stickyDesired = true;
    return super.render(options, legacyOptions);
  }

  async close(options = {}) {
    if (!this._explicitClose) {
      if (this.rendered) this.bringToFront?.();
      return this;
    }
    return super.close(options);
  }

  async closeExplicitly() {
    this._explicitClose = true;
    this._stickyDesired = false;
    this.stopStickyGuard();
    try {
      return await super.close();
    } finally {
      this._explicitClose = false;
    }
  }

  isAttached() {
    return Boolean(this.element?.isConnected || globalThis.document?.getElementById?.(this.id));
  }

  ensureStickyPresence() {
    if (!this._stickyDesired || this._explicitClose || !game?.ready) return;
    if (globalThis.document?.visibilityState === "hidden") return;
    if (!this.isAttached()) this.scheduleStickyRestore();
  }

  startStickyGuard() {
    if (this._guardStarted) return;
    this._guardStarted = true;

    this._visibilityHandler = () => this.ensureStickyPresence();
    this._focusHandler = () => this.ensureStickyPresence();
    globalThis.document?.addEventListener?.("visibilitychange", this._visibilityHandler);
    globalThis.window?.addEventListener?.("focus", this._focusHandler);

    if (typeof globalThis.MutationObserver !== "function" || !globalThis.document?.body) return;
    this._observer = new globalThis.MutationObserver(() => this.ensureStickyPresence());
    this._observer.observe(globalThis.document.body, { childList: true, subtree: true });
  }

  stopStickyGuard() {
    clearTimeout(this._restoreTimer);
    this._restoreTimer = null;
    this._observer?.disconnect?.();
    this._observer = null;
    if (this._visibilityHandler) globalThis.document?.removeEventListener?.("visibilitychange", this._visibilityHandler);
    if (this._focusHandler) globalThis.window?.removeEventListener?.("focus", this._focusHandler);
    this._visibilityHandler = null;
    this._focusHandler = null;
    this._guardStarted = false;
  }

  scheduleStickyRestore() {
    if (this._restoreTimer || !this._stickyDesired) return;
    this._restoreTimer = setTimeout(() => {
      this._restoreTimer = null;
      if (!this._stickyDesired || this._explicitClose || !game?.ready || globalThis.document?.visibilityState === "hidden") return;
      void Promise.resolve().then(() => this.render({ force: true })).catch((error) => {
        console.error(`${MODULE_ID} | Could not restore the sticky floating board`, error);
      });
    }, 0);
  }

  ensureSceneDraft() {
    const id = getActiveScene()?.id ?? null;
    if (id !== this._sceneId) {
      this._sceneId = id;
      this._draftPatch = {};
    }
  }

  controlsRequireApply() {
    return game.settings.get(MODULE_ID, SETTINGS.CONTROL_CHANGE_BEHAVIOR) === CONTROL_CHANGE_BEHAVIORS.APPLY;
  }

  stagePatch(patch) {
    this._draftPatch = mergeStatePatch(this._draftPatch, patch);
  }

  draftState() {
    return mergeStatePatch(getSceneState(), this._draftPatch);
  }

  async _prepareContext(options) {
    this.ensureSceneDraft();
    const pending = hasKeys(this._draftPatch);
    return {
      ...(await super._prepareContext(options)),
      ...buildSceneContext({ compact: true, stateOverride: this._draftPatch, hasPendingChanges: pending }),
      showApplyControls: this.controlsRequireApply(),
      controlBehaviorLabel: game.i18n.localize(this.controlsRequireApply() ? "SLK.Floating.StagedBehavior" : "SLK.Floating.ImmediateBehavior"),
      canApplyChanges: pending
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._stickyDesired = true;
    if (this.window?.close) {
      this.window.close.hidden = true;
      this.window.close.tabIndex = -1;
      this.window.close.setAttribute?.("aria-hidden", "true");
    }
    this.startStickyGuard();
    this.element?.querySelectorAll("input[data-slk-quick], select[data-slk-quick]").forEach((input) => {
      input.addEventListener("input", () => this.onInput(input));
      input.addEventListener("change", () => void this.onChange(input));
    });
  }

  onInput(input) {
    const output = this.element?.querySelector(`[data-slk-output="${input.dataset.slkQuick}"]`);
    if (output) output.textContent = this.formatOutput(input);
    const patch = this.patchFromInput(input);
    if (this.controlsRequireApply()) {
      this.stagePatch(patch);
      const apply = this.element?.querySelector('[data-action="applyChanges"]');
      if (apply) apply.disabled = false;
      return;
    }
    if (!game.settings.get(MODULE_ID, SETTINGS.LIVE_PREVIEW)) return;
    if (typeof canvas?.environment?.animateDarkness !== "function") return;
    const darkness = computeDarkness(mergeStatePatch(this.draftState(), patch), calculationOptions());
    void Promise.resolve().then(() => canvas.environment.animateDarkness(darkness, { duration: 150 })).catch(() => {});
  }

  async onChange(input) {
    const patch = this.patchFromInput(input);
    if (this.controlsRequireApply()) {
      this.stagePatch(patch);
      await renderIfOpen(this);
      return;
    }
    await this.applyPatch(patch);
  }

  async applyInput(input) {
    return this.onChange(input);
  }

  async applyPatch(patch) {
    if (this._busy) return;
    this._busy = true;
    try {
      await patchAndApplySceneState(patch, {
        notify: false,
        source: "floating-board"
      });
      this._draftPatch = {};
      await renderIfOpen(this);
    } catch (error) {
      reportUiError("Floating board input", error);
    } finally {
      this._busy = false;
    }
  }

  patchFromInput(input) {
    const field = input.dataset.slkQuick;
    const numericFields = new Set(["feel", "phase", "clockMinutes", "imperialBell", "moonIndex"]);
    const value = numericFields.has(field) ? Number(input.value) : input.value;
    const mode = { feel: MODES.FEEL, phase: MODES.PHASE, clockMinutes: MODES.CLOCK, imperialBell: MODES.IMPERIAL }[field];
    return { [field]: value, ...(mode ? { mode } : {}) };
  }

  formatMinutes(value) {
    const safe = Math.max(0, Math.min(1439, Math.round(value)));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  formatOutput(input) {
    const value = Number(input.value);
    if (input.dataset.format === "clock") return this.formatMinutes(value);
    if (input.dataset.format === "moon") {
      const index = Math.max(0, Math.min(MOON_PHASES.length - 1, Math.round(value)));
      const id = MOON_PHASES[index].id;
      return game.i18n.localize(`SLK.Moon.${id[0].toUpperCase()}${id.slice(1)}`);
    }
    return String(Math.round(value));
  }

  _onPosition(position) {
    super._onPosition(position);
    if (this._ignorePositionSave) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => void saveWindowState(SETTINGS.FLOATING_STATE, position), 250);
  }

  _onClose(options) {
    clearTimeout(this._saveTimer);
    void saveWindowState(SETTINGS.FLOATING_STATE, this.position);
    super._onClose(options);
    if (this._stickyDesired && !this._explicitClose) this.scheduleStickyRestore();
    else this.stopStickyGuard();
  }

  resetLayout() {
    clearTimeout(this._saveTimer);
    this._ignorePositionSave = true;
    this.setPosition(loadWindowState(SETTINGS.FLOATING_STATE, { width: 380, height: 620, left: 24, top: 160 }));
    this._ignorePositionSave = false;
  }

  static onOpenPanel(event) {
    event.preventDefault();
    return runUiAction("Floating board open panel", () => globalThis.SceneLightkeeper?.open?.());
  }

  static onOpenGuide(event) {
    event.preventDefault();
    return runUiAction("Floating board guide", () => showHowToGuide());
  }

  static onCloseBoard(event) {
    event.preventDefault();
    return runUiAction("Floating board explicit close", () => this.closeExplicitly());
  }

  static onApplyChanges(event) {
    event.preventDefault();
    return runUiAction("Floating board apply", async () => {
      if (!hasKeys(this._draftPatch)) return;
      await this.applyPatch(this._draftPatch);
    });
  }

  static onDiscardChanges(event) {
    event.preventDefault();
    return runUiAction("Floating board discard", async () => {
      this._draftPatch = {};
      await renderIfOpen(this);
    });
  }
}
