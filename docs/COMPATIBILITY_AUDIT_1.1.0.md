# Foundry VTT v13 Compatibility Audit — 1.1.0

## Confirmed v13 patterns

- Uses `foundry.applications.api.ApplicationV2`, `HandlebarsApplicationMixin`, and `DialogV2`.
- Uses the v13 Scene Controls record supplied by `getSceneControlButtons`.
- Uses `Scene.environment.darknessLevel`, `Scene.environment.globalLight`, `Scene.fog.exploration`, and `Scene.tokenVision` fields documented for v13.
- Uses the public `canvas.fog.reset()` API for destructive explored-fog reset.
- Uses `canvasReady` for viewed-Scene lifecycle synchronization.
- Uses native DOM APIs and module-scoped CSS; no jQuery assumptions.
- Uses `Scene#canUserModify` plus GM restrictions before mutations.

## Removed or avoided risks

- No `FormApplication`, ApplicationV1, `html.find`, jQuery, `renderChatMessage`, socketlib, or array-style v12 Scene Controls mutation.
- No deprecated `Scene#darkness` field.
- No forced re-render of closed ApplicationV2 windows.
- No unbounded Scene-switch update loop; module updates carry an option marker and canvas synchronization is scene-ID/generation gated.
- No copying of embedded documents or unrelated Scene fields during illumination synchronization.
- No claim of v14 compatibility; manifest maximum is v13.

## Known runtime boundary

A live Foundry 13.351 browser client is still required for final visual inspection and multi-client module-interference testing. The source archive contains a dedicated manual checklist for those checks.
