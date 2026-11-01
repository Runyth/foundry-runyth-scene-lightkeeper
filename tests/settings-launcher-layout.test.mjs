// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../module/styles/runyth-scene-lightkeeper.css", import.meta.url), "utf8");

test("Settings launcher labels cannot overflow their fixed sidebar buttons", () => {
  assert.match(css, /\.slk-settings-launcher button \{[^}]*overflow:\s*hidden;[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /\.slk-settings-launcher-label \{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /grid-template-columns:\s*minmax\(0,1fr\)\s+minmax\(0,1fr\)/);
});

test("compact launcher materially reduces height and hides all prose labels", () => {
  assert.match(css, /\.slk-settings-launcher\.compact \{[^}]*padding:\s*4px 6px;/s);
  assert.match(css, /\.slk-settings-launcher\.compact h3 > span,[\s\S]*\.slk-settings-launcher\.compact \.slk-settings-launcher-label \{ display:\s*none; \}/);
  assert.match(css, /\.slk-settings-launcher\.compact button \{[^}]*height:\s*26px;[^}]*min-height:\s*26px;/s);
  assert.doesNotMatch(css, /@media \(max-width:\s*430px\)[\s\S]*slk-settings-launcher:not\(\.compact\)/);
});
