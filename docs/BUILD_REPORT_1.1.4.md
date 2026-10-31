# Scene Lightkeeper 1.1.4 — Build and Release Report

## Release purpose

This patch responds to live Foundry VTT v13 use in which the full dashboard was difficult to rediscover and the optional floating mini-dashboard behaved like an ordinary application window. It also documents the compact-board Apply behaviour that was technically correct but not sufficiently obvious.

## Delivered changes

### Discoverable access

- Retained the native left Scene Controls sun group.
- Added a GM-only Scene Lightkeeper quick launcher directly to Foundry's normal Settings sidebar.
- Added separate buttons for the full dashboard and the floating board.
- Prevented duplicate launchers across repeated Settings-sidebar renders.
- Kept this launcher independent from `getSceneControlButtons`, preserving an access path when a third-party Scene Controls hook fails.

### Pinned floating board

- Replaced toggle-close behaviour with open-or-focus behaviour at every launcher and API entry point.
- Rejected generic ApplicationV2 close requests, including Escape-driven closure.
- Disabled minimization.
- Hid and removed keyboard access from the native frame close button.
- Added one explicit close button inside the board's own content header.
- Added restoration after external DOM teardown while Foundry is ready and visible.
- Added restoration checks on DOM mutation, browser-tab visibility return, and Foundry-window focus.
- Preserved saved client-local size and position after an explicit close and later reopen.

### Apply-button explanation

The missing Apply button under the default configuration was intentional: the mini-dashboard's sliders apply immediately and interactively, so Apply would duplicate the same action and consume limited space. Version 1.1.4 makes this contract explicit in the board itself and throughout the documentation.

When the world setting **Slider and field application** is changed to **Stage controls until Apply**, the mini-dashboard displays Apply and Discard and holds all changed values until Apply.

## Architecture and safety

- Foundry v13 ApplicationV2 remains the only application framework used.
- All launcher actions use the shared contained Promise/error boundary.
- The persistent board uses public render, close, and focus methods for its primary contract.
- Restoration is coalesced and guarded by desired-open state, explicit-close state, Foundry readiness, and document visibility.
- Explicit close disables all restoration observers and listeners before closing.
- Scene data, fog, vision, lights, walls, tokens, and unrelated flags are untouched by this UI-only patch.
- English and German remain modular Foundry-native language dictionaries with complete key parity.

## Release contents

1. Reproducible full source ZIP.
2. Minimal ready-to-install module ZIP.
3. Documentation/report/audit/changelog/test-results ZIP.

All archives use deterministic file ordering, timestamps, permissions, compression, and a single expected root directory.

## Qualification status

- Automated Node test suite: 89 tests passed.
- Strict unhandled-Promise-rejection mode: passed.
- Production JavaScript syntax validation: passed.
- Foundry v13 static compatibility audit: passed.
- Modular localization contract and parity: passed.
- Independent archive builds: required to be byte-identical by the release gate.
- Rebuild from extracted source ZIP: required to be byte-identical by the release gate.

A live Foundry browser client was not available in the build environment. The reported live failure modes were converted into executable regression coverage and an expanded manual Foundry v13 checklist.
