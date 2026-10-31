# Scene Lightkeeper 1.0.0 Build Report

## Release identity

- Module ID: `runyth-scene-lightkeeper`
- Version: `1.0.0`
- Public API: `1.0.0`
- Foundry target: minimum 13, verified manifest 13.351
- Game-system dependency: none
- Languages: German and English

## Implemented

- Four interchangeable, understandable lighting controls:
  - perceived darkness from 0 to 100;
  - sunrise-to-night day progression;
  - exact 24-hour ordinary time;
  - exact 1–33 Imperial Glocke.
- Imperial calendar context with Nachtwache, Kronwache, Laternenwache, Imperial date fields, three Umgänge, and day within Umgang.
- Five-step moonlight and optional spring, summer, autumn, and winter sunrise/sunset behavior.
- Optional derivation of season from the 33-month Imperial year.
- Automatic, always-on, off, and preserve-existing global-light handling, including a plain-language automatic cutoff.
- Native darkness transition duration and darkness lock.
- Independent token-vision and fog-exploration controls.
- Confirmed, GM-only reset of explored fog through Foundry's public FogManager.
- Permanent v13 Scene Controls group, full ApplicationV2 panel, Configure Settings hub, and optional movable floating board.
- Client-local persisted and viewport-clamped size and position for the main and floating windows.
- Native DOM listeners, contained async failures, scoped CSS, responsive button/input layout, and safe native dialog closure.
- Stable public API and system-neutral scene-state storage.

## Validation

- 39 automated tests passed.
- 12 production JavaScript modules passed `node --check`.
- Static Foundry v13 compatibility audit passed.
- ApplicationV2 lifecycle and settings-menu registration passed under mocked Foundry lifecycle tests.
- Scene Controls record shape, idempotent registration, and active-tool requirements passed.
- Permission, exact-field mutation, global-light mode, fog-reset, transition, season, moon, Imperial watch, Umgang, and malformed-state tests passed.
- German and English localization parity passed for 137 keys.
- Production import, manifest path, runtime template, CSS isolation, and prohibited legacy-pattern audits passed.

## Runtime limitation

No live Foundry VTT 13 browser client was launched in this build environment. The source archive includes `docs/MANUAL_TEST_CHECKLIST.md` for final visual and multi-client qualification in the target world and module stack. No claim of live runtime testing is made.
