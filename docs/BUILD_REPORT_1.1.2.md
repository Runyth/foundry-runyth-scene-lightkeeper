# Scene Lightkeeper 1.1.2 Build Report

## Scope

Patch release implementing explicit mode preview/application, configurable control staging, richer calendar presentation, calendar-derived seasons, configurable fog confirmation, complementary time-system registration, and a terse in-module guide.

## Interaction changes

- Main mode tabs are non-destructive previews by default.
- Apply and Discard are shown when a different mode or staged control values are pending.
- A world setting restores immediate tab application.
- Sliders and fields remain immediate by default and may globally be changed to staged application.
- Perceived-darkness presets remain immediate in every configuration.
- Side controls do not activate a mode that is merely being inspected.
- The floating board presents Apply/Discard when staged-control behaviour is enabled.

## Calendar and extension changes

- Course of the day renders approximate ordinary and Imperial time.
- 24-hour mode includes ordinary year/month/day.
- Complete Scene synchronization includes ordinary date, Imperial date, and season source.
- Calendar season mode maps ordinary months in 24-hour mode and 33 Imperial months in Glocke mode.
- A synchronous, ordered, mode-filtered time-system registry is available to complementary modules.
- Invalid, duplicate, throwing, empty, and asynchronous formatter cases are tested and contained.

## Safety changes

- Fog confirmation is centralized in one function shared by menu and toolbar entry points.
- Confirmation is a restricted world setting and defaults to enabled.
- Dialogs allow native closure and cancellation.
- UI action entry points continue to contain synchronous throws and Promise rejections.
- Staged state is per application instance and resets when the active Scene changes.

## Quality gates

Automated validation completed with **75/75 tests**, **16/16 production-module syntax checks**, **20 audited runtime source files**, and **186/186 English/German localization keys**.

The release is accepted only after:

1. Production JavaScript syntax validation.
2. Strict Node test execution with unhandled rejections treated as fatal.
3. Static Foundry v13 compatibility and UX-contract audit.
4. English/German key parity and referenced-key validation.
5. CSS selector scoping validation.
6. ZIP integrity, safe-path, single-root, and runtime/source-separation validation.
7. Independent deterministic builds.
8. Full checks from the extracted source archive.
9. Byte-identical reconstruction from the source archive.

A live Foundry browser was not available in the build environment; the manual checklist defines the remaining in-client qualification steps.
