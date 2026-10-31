# Compatibility Audit 1.1.1

Date: 2026-08-02
Target: Foundry VTT 13.351

## Reported failure

The supplied Foundry log showed repeated failures in `ControlPanel.onSwitchMode`:

```text
TypeError: this.run is not a function
```

Foundry ApplicationV2 invokes configured `DEFAULT_OPTIONS.actions` handlers with the Application instance as `this`. Version 1.1.0 defined `run` as a static class method, so it was unavailable on that instance. Every control-panel action using the same dispatcher was affected, not only mode switching.

## Correction

- Removed the invalid static dispatcher.
- Added one shared `runUiAction` utility that contains both synchronous and asynchronous errors.
- Updated all module-owned ApplicationV2 action maps and Scene Controls callbacks to use the same error boundary.
- Made action handlers return their contained Promise so the behavior can be exercised exactly in tests.
- Preserved instance access for re-rendering and native `close()` behavior.

## Additional v13 hardening

- Live-preview animation accepts Promise-returning or synchronous implementations and contains synchronous animation failures.
- Scene Controls registration accepts the documented v13 `Record<string, SceneControl>` shape and ignores arrays rather than mutating them.
- Static audit rejects the exact `this.run(...)` regression and legacy `controls.push(...)` usage.
- ApplicationV1, jQuery listener patterns, global selectors, socket dependencies, and unscoped CSS remain prohibited.
- Manifest remains constrained to Foundry v13 and verified against 13.351.

## External log findings

The log also contains `controls.push is not a function` attributed by Foundry to `objects-interactions-fx(1.1.5)`. That is a separate module using the obsolete pre-v13 Scene Controls array shape. Scene Lightkeeper does not use or patch that module; its own registration now explicitly rejects array input and continues using the official v13 record shape.
