// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.id = "";
    this.className = "";
    this.textContent = "";
    this.type = "";
    this.title = "";
  }
  append(...children) {
    for (const child of children) {
      this.children.push(child);
      if (child instanceof FakeElement) child.parentElement = this;
    }
  }
  prepend(child) {
    this.children.unshift(child);
    if (child instanceof FakeElement) child.parentElement = this;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  querySelector(selector) {
    const matches = (node) => {
      if (!(node instanceof FakeElement)) return false;
      if (selector.startsWith("#")) return node.id === selector.slice(1);
      if (selector.startsWith(".")) return node.className.split(/\s+/).includes(selector.slice(1));
      const data = selector.match(/^\[data-slk-launcher-action=['"]([^'"]+)['"]\]$/);
      if (data) return node.dataset.slkLauncherAction === data[1];
      return false;
    };
    const queue = [...this.children];
    while (queue.length) {
      const node = queue.shift();
      if (matches(node)) return node;
      if (node instanceof FakeElement) queue.push(...node.children);
    }
    return null;
  }
  click() {
    this.listeners.get("click")?.({ preventDefault() {} });
  }
}

class FakeTextNode {
  constructor(text) { this.textContent = text; }
}

globalThis.HTMLElement = FakeElement;
globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeTextNode(text)
};
const calls = { open: 0, floating: 0 };
globalThis.SceneLightkeeper = {
  open: async () => { calls.open += 1; },
  toggleFloating: async () => { calls.floating += 1; }
};
let launcherSize = "standard";
globalThis.game = {
  user: { isGM: true },
  i18n: { localize: (key) => key },
  settings: { get: () => launcherSize }
};
globalThis.ui = { notifications: { error() {} } };

const { renderSettingsLauncher, SETTINGS_LAUNCHER_ID } = await import("../module/scripts/ui/settings-launcher.mjs");

test("Foundry Settings sidebar receives one direct Lightkeeper launcher", async () => {
  const root = new FakeElement("section");
  const buttons = new FakeElement("div");
  buttons.className = "settings-buttons";
  root.append(buttons);

  renderSettingsLauncher({ element: root }, root);
  renderSettingsLauncher({ element: root }, root);

  const launcher = root.querySelector(`#${SETTINGS_LAUNCHER_ID}`);
  assert.ok(launcher);
  assert.equal(buttons.children.filter((child) => child.id === SETTINGS_LAUNCHER_ID).length, 1);

  launcher.querySelector('[data-slk-launcher-action="open"]').click();
  launcher.querySelector('[data-slk-launcher-action="floating"]').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, { open: 1, floating: 1 });
});

test("Settings sidebar launcher remains GM-only", () => {
  game.user.isGM = false;
  const root = new FakeElement("section");
  renderSettingsLauncher({ element: root }, root);
  assert.equal(root.querySelector(`#${SETTINGS_LAUNCHER_ID}`), null);
  game.user.isGM = true;
});


test("launcher uses short visible labels while preserving full accessible action names", () => {
  launcherSize = "standard";
  const root = new FakeElement("section");
  renderSettingsLauncher({ element: root }, root);
  const launcher = root.querySelector(`#${SETTINGS_LAUNCHER_ID}`);
  const open = launcher.querySelector('[data-slk-launcher-action="open"]');
  const floating = launcher.querySelector('[data-slk-launcher-action="floating"]');

  assert.equal(open.children[1].textContent, "SLK.SettingsLauncher.OpenShort");
  assert.equal(floating.children[1].textContent, "SLK.SettingsLauncher.FloatingShort");
  assert.equal(open.title, "SLK.SettingsLauncher.Open");
  assert.equal(floating.title, "SLK.SettingsLauncher.Floating");
  assert.equal(open.attributes.get("aria-label"), "SLK.SettingsLauncher.Open");
  assert.equal(floating.attributes.get("aria-label"), "SLK.SettingsLauncher.Floating");
});

test("compact global launcher mode renders the same actions in a compact card", () => {
  launcherSize = "compact";
  const root = new FakeElement("section");
  renderSettingsLauncher({ element: root }, root);
  const launcher = root.querySelector(`#${SETTINGS_LAUNCHER_ID}`);
  assert.match(launcher.className, /\bcompact\b/);
  assert.ok(launcher.querySelector('[data-slk-launcher-action="open"]'));
  assert.ok(launcher.querySelector('[data-slk-launcher-action="floating"]'));
  launcherSize = "standard";
});
