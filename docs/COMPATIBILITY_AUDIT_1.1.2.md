# Foundry VTT v13 Compatibility Audit — 1.1.2

## Runtime framework

- Full panel, floating board, and settings hub use `ApplicationV2` through `HandlebarsApplicationMixin`.
- Application actions are instance-bound, return contained Promises, and do not use the regressed `this.run(...)` pattern.
- Scene Controls use the v13 record shape and reject malformed array input rather than invoking legacy `controls.push(...)` mutation.
- Dialogs use `DialogV2` and set `rejectClose: false`.
- No V1 `Application`, `FormApplication`, jQuery listener, socketlib, or deprecated chat-render hook is used.

## Scene data boundaries

Lighting application writes only:

- `flags.runyth-scene-lightkeeper.state`
- `environment.darknessLevel`
- applicable `environment.globalLight` fields

Dedicated actions may separately write:

- `environment.darknessLevelLock`
- `fog.exploration`
- `tokenVision`

Explored-fog reset uses the active canvas FogManager and remains GM-only. Scene synchronization does not copy fog, token vision, walls, tokens, Ambient Lights, regions, sounds, weather, ownership, or unrelated flags.

## State compatibility

- State schema 2 adds ordinary date and season source while normalizing older saved states through defaults.
- Legacy `deriveSeasonFromImperialMonth` remains hidden and supported as a fallback.
- Lighting snapshot schema 2 carries both calendar dates and season source in profile synchronization.
- Nested date patches preserve unspecified values.

## UI and interoperability

- All module CSS selectors are scoped with `.slk-`.
- Window geometry is client-scoped, clamped to the viewport, and reset-safe.
- Delayed refreshes render only already-open windows.
- Third-party time-system formatters are synchronous, individually isolated, and unable to block other displays.
- The module has no required dependencies and remains system-neutral.

## Manifest

- Minimum: Foundry 13
- Verified: Foundry 13.351
- Maximum: Foundry 13
- Game system restriction: none
- Required modules: none
