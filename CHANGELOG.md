# Changelog

## 1.1.8 - 2026-11-01

### Fixed

- Attributed the source licence headers to the same holder the README Licence chapter names so every module surface carries the same copyright holder.

## 1.1.6 — 2026-10-31

- Licensed the program under AGPL-3.0-or-later.
- Aligned the unpublished module id with `runyth-scene-lightkeeper`.
- Published install, source, and documentation archives as `-mod`, `-src`, and `-doc`.

## 1.1.5 — 2026-08-19

- Reworked the Foundry Settings-sidebar quick launcher so the two action buttons no longer attempt to fit long phrases into narrow fixed-width columns.
- Replaced the visible launcher button copy with localization-safe short labels (**Dashboard** / **Board**) while preserving complete action wording through native tooltips and ARIA labels.
- Added hard overflow containment (`minmax(0, 1fr)`, no-wrap, hidden overflow, and ellipsis) so unusually long complementary translations cannot escape their buttons.
- Removed the narrow-sidebar rule that stacked the two launcher buttons vertically; the standard launcher now keeps the same two-column footprint without consuming additional vertical Settings real estate.
- Added the global **Settings sidebar launcher size** world setting with **Standard (current size)** as the default and a substantially smaller **Compact** mode.
- Compact mode collapses the launcher to one slim row containing a reduced sun logo and two 28×26 px icon buttons, while retaining full tooltip and accessible names.
- Launcher-size changes apply immediately to an already-rendered Settings sidebar without requiring a world reload.
- Expanded regression coverage for launcher label/accessibility separation, CSS overflow containment, compact geometry, world-setting defaults, immediate setting updates, and localization parity.

## 1.1.4 — 2026-08-05

- Added a permanent GM-only Scene Lightkeeper quick launcher directly to Foundry's Settings sidebar, providing one-click access to the full dashboard and the floating board without entering Configure Settings.
- Kept the native left Scene Controls sun group as the primary in-canvas entry point and made the Settings-sidebar launcher independent of Scene Controls so an incompatible third-party hook cannot remove every access path.
- Converted the floating board into a pinned companion window: Escape, ordinary ApplicationV2 close requests, launcher re-clicks, opening other applications, Scene changes, focus changes, and interface rerenders cannot close it.
- Disabled floating-board minimization and hid the native frame close control so the only supported close path is the board's own visible X button.
- Added guarded self-restoration after external DOM teardown, browser-tab visibility return, or window refocus while the board is meant to remain open.
- Changed all floating-board launchers and the compatibility `toggleFloating()` API to open or focus rather than toggle closed; added explicit `openFloating()` API documentation.
- Clarified the mini-dashboard Apply design in the interface, guide, README, API reference, and manual test checklist: immediate sliders intentionally omit Apply, while globally staged controls reveal Apply and Discard.
- Expanded automated regression coverage for Settings-sidebar discoverability, duplicate-launcher prevention, GM visibility, instance-bound launcher actions, Escape/generic-close rejection, explicit-X closure, teardown restoration, native-close suppression, focus behaviour, and conditional Apply controls.
- Added a dedicated documentation/report/audit/test-results release archive and upgraded deterministic release verification to validate all three independently reproducible ZIPs.

## 1.1.3 — 2026-08-03

- Confirmed and formalized Foundry-native modular localization; no module-specific language selector is added because Foundry already owns language selection.
- Kept English as the complete default source-of-truth in `lang/en.json` and German as an independent bundled `lang/de.json` pack declared through `module.json`.
- Localized the remaining user-visible settings-hub footer and first-run dialog title.
- Added a translator guide for bundled languages and independent complementary language-pack modules.
- Added a dedicated localization gate covering manifest entries, standard paths, namespace isolation, English baseline order, key parity, dynamic keys, non-empty values, format-placeholder parity, hard-coded template text, and prohibition of dashboard language controls.
- Generalized the compatibility audit so future bundled languages are validated automatically instead of hard-coding English/German assumptions.

## 1.1.2 — 2026-08-02

- Changed main lighting-mode buttons to non-destructive previews by default; a new **Apply lighting** action commits the inspected scheme.
- Added a world setting to restore the previous immediate mode-switch behaviour.
- Kept perceived-darkness presets immediate regardless of staging settings.
- Kept sliders and fields immediate with interactive preview by default, with a new world setting to stage all control changes until Apply.
- Prevented side controls such as moon, season, or global-light mode from accidentally activating a different mode that is merely being inspected.
- Added Apply and Discard controls to the floating board when staged-control behaviour is enabled.
- Added approximate Imperial Glocke/watch time beside ordinary time in Course of the day.
- Added ordinary year, month, and day to 24-hour mode.
- Added manual or calendar-derived season source per Scene, using ordinary months in 24-hour mode and the 33-month Imperial calendar in Glocke mode.
- Added a complementary-module time-system registry with ordering, mode filtering, localization keys, safe unregistration, and contained formatter failures.
- Added the `sceneLightkeeperReady` hook and public API methods for time-system registration and the help guide.
- Centralized explored-fog reset confirmation so the full panel and Scene Controls cannot bypass one another. Confirmation remains enabled by default and is globally configurable.
- Added a terse four-step in-module guide to the panel, floating board, and settings hub.
- Expanded state and synchronization schemas so complete lighting profiles carry ordinary date, Imperial date, and season source.
- Expanded automated coverage for staging defaults, immediate legacy mode, presets, side-control isolation, both calendar season mappings, both dates, displayed time equivalents, complementary time systems, asynchronous formatter rejection, fog confirmation, and API registration.

## 1.1.1 — 2026-08-02

- Fixed every Lightkeeper control-panel button failing with `TypeError: this.run is not a function` under Foundry v13 ApplicationV2 action binding.
- Replaced the invalid static action dispatcher with a shared contained Promise runner used by the control panel, floating board, settings hub, and Scene Controls.
- Ensured every ApplicationV2 action returns a handled Promise, prevents native button behavior, and reports synchronous or asynchronous failures without unhandled rejections.
- Added executable integration coverage for every rendered button and Scene Controls tool using Foundry's instance-bound action-callback semantics.
- Added strict template-to-action parity checks, which also found and removed an unused floating-board action with no rendered button.
- Added slider/select event-wiring, field-conversion, nested Imperial-date, quick-control, and synchronous live-preview compatibility tests.
- Hardened live preview against animation implementations that return synchronously.
- Hardened Scene Controls registration against array-shaped data supplied by incompatible third-party hooks.
- Added strict unhandled-rejection testing, cross-file version consistency checks, and explicit regression rejection for `this.run(...)` and legacy `controls.push(...)` patterns.
- Added an automated release gate that verifies both ZIP layouts and integrity, performs independent deterministic builds, tests the extracted source archive, and requires byte-identical source-ZIP reconstruction.

## 1.1.0 — 2026-08-02

- Added optional Scene-switch lighting synchronization.
- Added **Keep illumination grade**, which copies exact visible darkness and native global-illumination values while retaining the destination Scene's time, moon, season, fog, and vision configuration.
- Added **Keep complete lighting profile**, which carries the selected mode, time or Glocke, Imperial date, moon, season, darkness, transition, and global illumination to the newly viewed Scene.
- Added optional restoration of the last remembered lighting when the first canvas opens after login or reload.
- Added redundant-write avoidance and rapid-switch coalescing so superseded intermediate Scenes are not modified.
- Added synchronization status to the full panel, floating board, and settings hub.
- Fixed delayed asynchronous updates being able to reopen a window after the GM closed it.
- Added persistent size and position handling for the settings hub.
- Fixed layout reset being undone later by still-open windows.
- Disabled all Scene-mutating controls when the current user cannot update the Scene.
- Fixed moon-phase labels temporarily turning into numeric indices while dragging.
- Improved button text wrapping, narrow-window behavior, and synchronization status layout.
- Tightened the manifest to Foundry VTT 13 instead of claiming untested v14 compatibility.
- Expanded automated lifecycle, synchronization, race, permissions, localization, and static compatibility coverage.

## 1.0.0 — 2026-08-02

- Added four simple scene-lighting modes: perceived darkness, day progression, 24-hour time, and 33-Glocken Imperial time.
- Added moonlight and optional seasonal sunrise/sunset calculation.
- Added Imperial watches, date fields, and Umgang display.
- Added safe global-light modes with automatic handling as the default and preserve-existing as an option.
- Added token-vision, fog-exploration, and confirmed GM fog-reset controls.
- Added a Foundry v13 Scene Controls group, full ApplicationV2 panel, settings hub, and optional movable floating board.
- Added client-local window position and size persistence, German/English localization, public API, tests, audits, and reproducible packaging.
