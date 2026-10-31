# Foundry v13 Compatibility and Interference Audit

## Scope

Scene Lightkeeper 1.0.0 was statically audited as a new system-neutral module targeting Foundry VTT 13.351.

## Implemented compatibility controls

- Uses `foundry.applications.api.ApplicationV2`, `HandlebarsApplicationMixin`, and `DialogV2`; no ApplicationV1 or FormApplication.
- Registers Scene Controls through the v13 record/object shape and never calls `push()` on the controls object.
- Uses native DOM APIs; no jQuery or `html.find(...)` assumptions.
- Updates only the current Scene's own darkness, selected global-light fields, token vision, fog exploration, and exact `flags.runyth-scene-lightkeeper.state` path.
- Uses the public active-canvas `canvas.fog.reset()` operation for explored-fog reset.
- Registers hooks once during `init`; render listeners are bound only to newly rendered module-owned elements.
- Keeps every CSS selector under `.slk-app` or `.slk-dialog`; no generic Foundry window, button, input, or accessibility selectors.
- Saves window geometry in client-scoped hidden settings and clamps restored geometry to the current viewport.
- Contains rejected async UI actions and reports actionable failures without suppressing unrelated package errors.
- Uses no socket and grants no player-authoritative mutation path.

## Data safety

The default global-light mode is **Automatic until cutoff** so the single 0–100 control also resolves Foundry's global-light threshold under the hood. It writes only the documented global-light enabled/range fields. **Preserve scene setting** is available whenever a preconfigured scene must retain those fields unchanged.

Fog reset does not change scene structure. It is limited to the active Scene, GM-only, and confirmed by default.

## Intentionally unchanged behavior

- Existing Ambient Lights, walls, sounds, weather, regions, tokens, and ownership are not rewritten.
- Other modules may continue to update Scene darkness. Scene Lightkeeper reflects subsequent active-scene updates and does not monkey-patch Scene methods.
- The module does not emulate vision modes or system-specific darkvision rules; it controls the scene environment and leaves perception to Foundry and the active game system.

## Environmental limitation

No live Foundry v13 browser client was launched in this build environment. Automated and static validation covers the source and packaged archives; the included manual checklist covers final runtime qualification in the target module stack.
