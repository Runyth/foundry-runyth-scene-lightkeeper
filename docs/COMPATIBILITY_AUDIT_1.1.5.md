# Scene Lightkeeper 1.1.5 — Foundry VTT v13 Compatibility Audit

## Target

- Foundry VTT minimum: 13
- Verified manifest build: 13.351
- Maximum: 13
- Game-system coupling: none
- Required modules: none

Official references:

- https://foundryvtt.com/api/v13/
- https://foundryvtt.com/article/module-development/

## Settings-sidebar integration

- The launcher continues to attach through the v13 `renderSettings` hook using native DOM APIs.
- Injection remains GM-only and idempotent across repeated Settings-sidebar renders.
- Standard and compact launcher modes use the same semantic `<button>` elements and action runner.
- The new launcher-size setting is registered through `game.settings.register` as a restricted world setting.
- Its default preserves the existing standard launcher; compact mode is explicit opt-in.
- A setting change updates the already-rendered launcher's class only and does not mutate Scene or canvas state.

## Narrow-layout safety

- Standard action columns use `minmax(0, 1fr)` rather than implicit minimum-content sizing.
- Action buttons and labels use `min-width: 0`, hidden overflow, and no-wrap containment.
- Labels use ellipsis as a final fallback for unusually long complementary translations.
- Complete action meaning remains available in `title` and `aria-label` even when visible text is shortened or hidden.
- The former <=430 px one-column launcher fallback was removed so narrow Foundry sidebars do not consume additional vertical space.
- Compact mode uses a fixed 28×26 px action footprint and reduced logo/prose presentation.

## Application and data safety

- Full dashboard, floating board, and settings hub remain ApplicationV2 applications.
- Scene Controls remain v13 record-shaped and never call `controls.push(...)`.
- The patch adds no Scene document update path and no new permission surface.
- Existing sticky floating-board behaviour, scene synchronization, fog confirmation, and application action containment are unchanged.

## Localization

- English remains the complete baseline language pack.
- German remains a separate complete pack.
- All new setting names, setting hints, choices, and short launcher labels are localized.
- Additional Foundry-native language packs can override the same `SLK.*` keys.
- Overflow containment is intentionally independent of the exact translated label length.

## Deprecated/interference pattern audit

The static gate continues to reject:

- `ApplicationV1`
- `FormApplication`
- legacy `renderChatMessage`
- jQuery `$()` and `html.find()` usage
- `socketlib` dependency
- the previously regressed `this.run(...)` action pattern
- legacy `controls.push(...)` Scene Controls mutation

## Result

No Foundry v13 compatibility blocker was identified in the changed runtime surface. The source test suite additionally verifies setting registration/defaults, immediate launcher-size updates, short-visible/full-accessible label separation, overflow containment CSS, compact geometry, localization parity, and all existing v13 compatibility gates.
