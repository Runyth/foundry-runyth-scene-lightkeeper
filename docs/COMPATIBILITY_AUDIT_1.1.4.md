# Scene Lightkeeper 1.1.4 — Foundry VTT v13 Compatibility Audit

## Target

- Foundry VTT minimum: 13
- Verified manifest build: 13.351
- Maximum: 13
- Game-system coupling: none
- Required modules: none

## Application framework

- Full dashboard, floating board, and settings hub use `ApplicationV2` with `HandlebarsApplicationMixin`.
- No V1 `Application`, `FormApplication`, jQuery event wiring, or deprecated `html.find()` patterns are present.
- ApplicationV2 action callbacks use instance binding and a shared rejection-safe action runner.

## Entry-point compatibility

- Scene Controls use the Foundry v13 record shape and never call `controls.push(...)`.
- Malformed or array-shaped Scene Controls hook input is ignored defensively.
- The new Settings-sidebar launcher is registered through `renderSettings`, is native-DOM based, GM-only, idempotent, localized, and independent from Scene Controls registration.
- Repeated sidebar renders cannot create duplicate launcher sections.

## Floating-board lifecycle

- Launchers and public API methods only open or focus the board.
- Ordinary `close()` requests are rejected unless marked by the board's explicit internal close path.
- The board is non-minimizable.
- The native frame close control is hidden, removed from tab order, and marked `aria-hidden`.
- Explicit close stops mutation, visibility, focus, and scheduled-restoration guards before calling the base close implementation.
- External teardown recovery is bounded by Foundry readiness, desired-open state, explicit-close state, and page visibility.
- Restoration requests are coalesced to avoid repeated renders.

## Data and permission safety

This patch does not expand Scene mutation scope. Existing lighting operations remain permission-gated and continue to avoid unrelated Scene data. Sticky-window handling does not write Scene documents or world settings. Geometry persists only in existing client-scoped settings.

## Localization and accessibility

- English remains the complete baseline pack.
- German remains a separate complete modular pack.
- All new launcher, pinned-window, close, and Apply-behaviour text is localized.
- Additional languages remain supported through Foundry-native language packs.
- The explicit close button has localized title and accessible label.
- The hidden native close control is not keyboard-focusable.
- Launcher controls use semantic buttons and an aria-labelled section.

## Known integration boundary

A third-party package can still throw earlier in Foundry's shared `getSceneControlButtons` hook and prevent some or all Scene Controls from rendering. Scene Lightkeeper cannot safely suppress another package's exception. Version 1.1.4 mitigates this by providing an independent Settings-sidebar launcher that does not rely on that hook.

## Deprecated/interference pattern audit

The static gate rejects:

- `ApplicationV1`
- `FormApplication`
- legacy `renderChatMessage`
- jQuery `$()` and `html.find()` usage
- `socketlib` dependency
- the previously regressed `this.run(...)` action pattern
- legacy `controls.push(...)` Scene Controls mutation

## Result

No new Foundry v13 compatibility blocker was identified in the changed runtime surface. Live in-client checks remain required for visual placement, module coexistence, keyboard behaviour, focus stacking, and browser-specific lifecycle behaviour; those cases are enumerated in `MANUAL_TEST_CHECKLIST.md`.
