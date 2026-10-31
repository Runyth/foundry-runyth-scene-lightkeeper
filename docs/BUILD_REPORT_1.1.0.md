# Build Report — Scene Lightkeeper 1.1.0

## Scope

Feature release adding optional world-level illumination continuity across Foundry Scene changes, plus a compatibility and UX hardening pass based on defects previously fixed in related Foundry v13 modules.

## Feature implementation

- Added a configurable Scene synchronization policy: off, exact illumination grade, or complete lighting profile.
- Added an optional initial-world-load restoration policy.
- Added a remembered world-level snapshot containing normalized Lightkeeper state, exact native darkness, and exact native global-light values.
- Added `canvasReady` orchestration for viewed-Scene changes.
- Added generation-based coalescing and a carried immutable snapshot so rapid Scene navigation updates only the final viewed Scene.
- Added no-op detection to avoid Scene writes when state, darkness, and global-light values already match.
- Excluded fog, token vision, walls, tokens, Ambient Lights, and unrelated flags by construction.

## Hardening changes

- Replaced force-renders after asynchronous operations with render-if-open behavior.
- Added settings-hub geometry persistence.
- Fixed reset-layout persistence while windows are already open.
- Added permission-disabled states across all mutation controls.
- Fixed live moon labels during slider input.
- Added responsive synchronization status surfaces and text wrapping.
- Restricted manifest compatibility to Foundry VTT v13, verified against the v13.351 API surface.

## Automated verification

- 46 of 46 Node tests passed.
- Syntax validation passed for all 12 production JavaScript modules.
- Static Foundry v13 audit passed across 16 runtime source files.
- English and German localization parity passed for 149 keys.
- Manifest paths, imports, ApplicationV2 inheritance, v13 Scene Controls shape, public fog-reset use, permissions, CSS isolation, and prohibited legacy patterns passed.
- Dedicated tests cover exact-grade synchronization, full-profile synchronization, initial-load restoration, no-op writes, rapid Scene-switch coalescing, remembered snapshots, mutation isolation, window-close races, and layout reset.

## Archive verification

- The installable ZIP contains one `runyth-scene-lightkeeper/` root and runtime files only.
- The source ZIP contains one `runyth-scene-lightkeeper-source/` root with source, tests, documentation, validation output, audits, and packaging tools.
- Both ZIPs passed full archive integrity checks.
- Two independent builds were byte-identical.
- The source ZIP was extracted in a clean directory, its complete check suite passed, and rebuilding from it reproduced both release ZIPs byte-for-byte.

## Manual qualification boundary

A live Foundry VTT v13 browser instance was not available in the build environment. The source archive therefore includes a dedicated manual test checklist for visual interaction, multi-client behavior, Scene switching, persistence, permissions, fog handling, and module coexistence.
