# Scene Lightkeeper 1.1.5 — Build and Release Report

## Release purpose

This patch addresses live Foundry VTT v13 sidebar usability: the Settings-sidebar launcher actions used full phrases inside two narrow columns, allowing visible text to overflow their button bounds. It also adds an optional much smaller launcher presentation for GMs who want to reclaim Settings-sidebar real estate without removing the independent Lightkeeper entry point.

## Delivered changes

### Overflow-safe standard launcher

- Kept the standard launcher card at its existing size and two-column action layout.
- Replaced the visible action phrases with deliberately short localized labels: **Dashboard** and **Board** in the English baseline.
- Preserved the complete action wording through button `title` and `aria-label` attributes.
- Added `minmax(0, 1fr)` grid tracks and `min-width: 0` to allow proper shrinking inside Foundry's sidebar.
- Added no-wrap, hidden overflow, and ellipsis containment so unexpectedly long translation labels cannot escape their buttons.
- Removed the former narrow-width rule that stacked both launcher buttons and consumed extra vertical sidebar space.

### Optional compact launcher

- Added the world-level **Settings sidebar launcher size** setting under Configure Settings → Module Settings → Scene Lightkeeper.
- Default remains **Standard (current size)**, preserving existing presentation for current worlds.
- **Compact** collapses the launcher into a single slim row.
- Compact mode reduces the sun logo, hides heading prose and helper text, and presents the two actions as 28×26 px icon buttons.
- Tooltips and accessible names remain complete in compact mode.
- Changing the setting updates an already-rendered launcher immediately without requiring a world reload.

## Architecture and safety

- The patch does not modify Scene lighting data, fog, token vision, walls, tokens, Ambient Lights, or scene flags.
- The new preference is a Foundry-native world setting, restricted to GM configuration.
- Standard and compact presentations share the same DOM actions and contained action runner, avoiding duplicate behaviour paths.
- No new runtime dependency is introduced.
- English and German remain modular Foundry-native localization dictionaries with complete key parity.

## Release contents

1. Reproducible full source ZIP.
2. Minimal ready-to-install module ZIP.
3. Documentation/report/audit/changelog/test-results ZIP.

All archives use deterministic file ordering, timestamps, permissions, compression, and a single expected root directory.

## Qualification status

- Automated Node test suite: 95 tests passed.
- Strict unhandled-Promise-rejection mode: passed.
- Production JavaScript syntax validation: passed.
- Foundry v13 static compatibility audit: passed.
- Modular localization contract and parity: passed.
- Independent archive builds: required to be byte-identical by the release gate.
- Rebuild from extracted source ZIP: required to be byte-identical by the release gate.

A live Foundry browser client was not available in the build environment. The reported overflow scenario was converted into layout-source regression checks plus an expanded manual Foundry v13 sidebar checklist.
