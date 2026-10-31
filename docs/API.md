# Public API — 1.1.5

```javascript
const api = game.modules.get("runyth-scene-lightkeeper")?.api;
```

The same frozen object is exposed as `globalThis.SceneLightkeeper` and emitted through:

```javascript
Hooks.once("sceneLightkeeperReady", (api) => {
  // Register integrations here.
});
```

## Core methods

| Method | Purpose |
|---|---|
| `open()` | Open the full panel. |
| `openSettings()` | Open the module settings hub. |
| `openFloating()` | Open the pinned compact board, or focus it if already open. |
| `toggleFloating(force?)` | Backwards-compatible alias for `openFloating()`; it no longer closes the pinned board. The optional argument is ignored. |
| `resetLayout()` | Clear and immediately reset all module-window geometries. |
| `refresh()` | Re-render only module windows that are already open. |
| `showGuide()` | Open the terse five-step usage guide. |
| `getState(scene?)` | Return normalized module state for a Scene. |
| `getCurrentLightingSnapshot()` | Return the remembered world-level lighting snapshot or `null`. |
| `captureCurrentLighting(scene?)` | Remember a Scene's Lightkeeper state, exact darkness, and native global-light values. |
| `syncLightingToScene(scene, options?)` | Apply remembered or supplied lighting using `grade` or `profile` synchronization. |
| `computeDarkness(state, options?)` | Pure 0–1 darkness calculation. |
| `apply(state, options?)` | Apply a complete state to a Scene. |
| `patch(patch, options?)` | Merge and apply a partial state, including nested dates. |
| `setFeel(value, options?)` | Select perceived-darkness mode and apply 0–100. |
| `setPhase(value, options?)` | Select day-progression mode and apply 0–100. |
| `setClock(minutes, options?)` | Select ordinary-clock mode and apply 0–1439. |
| `setImperialBell(bell, options?)` | Select Imperial mode and apply Glocke 1–33. |
| `setMoon(index, options?)` | Apply moon phase 0–4. |
| `setSeason(season, options?)` | Apply spring, summer, autumn, or winter. |
| `setDarknessLock(enabled, scene?)` | Enable or disable Foundry's native darkness lock. |
| `setFogExploration(enabled, scene?)` | Enable or disable remembered fog exploration. |
| `setTokenVision(enabled, scene?)` | Enable or disable token vision. |
| `requestFogReset(scene?)` | Run the configured confirmation policy, then reset explored fog. |
| `resetFog(scene?)` | Low-level GM-only fog reset without the UI confirmation wrapper. |

Use `requestFogReset()` for user-facing integrations. `resetFog()` remains available for controlled automation and backwards compatibility.

## Pinned floating-board contract

The floating board is intentionally not remotely closable through the public API. Calling `openFloating()` or the compatibility alias `toggleFloating()` always opens or focuses it. This guarantees that toolbar buttons, settings launchers, and complementary modules cannot accidentally toggle the persistent board away.

The board rejects ordinary ApplicationV2 `close()` requests, including Escape-driven closure, and restores itself if an external interface teardown removes it. Its one supported user close path is the visible X rendered inside the board's own content header. A later `openFloating()` call opens it again.

Apply controls depend on the world setting `controlChangeBehavior`:

- `immediate` (default): sliders apply interactively, so the compact board displays an explicit behaviour explanation and does not waste space on an Apply button.
- `apply`: changes are staged and the compact board displays Apply and Discard buttons.

## Lighting state additions

Relevant state fields include:

```javascript
{
  mode: "clock",              // feel | phase | clock | imperial
  clockMinutes: 720,
  imperialBell: 17,
  ordinaryDate: { year: 2026, month: 8, day: 2 },
  imperialDate: { year: 443, month: 3, day: 3 },
  season: "spring",
  seasonMode: "manual"        // manual | calendar
}
```

Calendar-derived seasons apply only in `clock` and `imperial` modes. Use `patch()` for dates or season source:

```javascript
await api.patch({
  mode: "clock",
  ordinaryDate: { year: 2026, month: 12, day: 21 },
  seasonMode: "calendar"
});
```

Nested date fields are merged instead of replacing unspecified year/month/day values.

## Complementary time systems

A complementary module may add a row beneath the built-in time equivalents:

```javascript
const unregister = api.registerTimeSystem({
  id: "my-module.calendar",
  labelKey: "MYMODULE.TimeSystem.Name",
  modes: ["phase", "clock", "imperial"],
  order: 100,
  format: ({ minutes, mode, state, scene, approximate, localize }) => {
    const prefix = approximate ? localize("MYMODULE.Time.About") : "";
    return `${prefix}${minutes} ticks`;
  }
});

// Later:
unregister();
```

Definition fields:

| Field | Requirement |
|---|---|
| `id` | Required unique identifier using letters, numbers, dots, underscores, or hyphens. |
| `label` | Plain text or synchronous label function. Use this or `labelKey`. |
| `labelKey` | Localization key. Use this or `label`. |
| `modes` | Optional subset of `phase`, `clock`, and `imperial`. Defaults to all three. |
| `order` | Optional numeric display order; default 100. |
| `format(context)` | Required synchronous formatter. Return text, `null`, or an empty string. |

Formatter context:

```javascript
{
  minutes,       // ordinary 0–1439 equivalent
  mode,          // phase | clock | imperial
  state,         // normalized displayed state
  scene,         // current Scene
  approximate,   // true for Course of the day
  localize       // localization helper
}
```

Asynchronous/thenable results are rejected and contained because Application rendering must remain synchronous. One broken integration does not suppress other registered systems.

Additional methods:

| Method | Purpose |
|---|---|
| `registerTimeSystem(definition)` | Register and return a disposer function. |
| `unregisterTimeSystem(id)` | Remove a registration by ID. |
| `getTimeSystems()` | Return sorted registration metadata without formatter functions. |

## Synchronization options

```javascript
await api.syncLightingToScene(scene, {
  mode: "grade", // grade | profile
  sourceScene,
  notify: false
});
```

A caller may provide `snapshot` instead of `sourceScene`.

- `grade` carries exact visible darkness and native global-light values.
- `profile` also carries mode, time, both dates, moon, season, season source, cutoff, and transition.

Synchronization does not write fog, token vision, walls, tokens, Ambient Lights, regions, sounds, weather, or unrelated flags.

All mutating methods resolve only after the underlying Scene, setting, or fog operation completes.
