# Runyth Scene Lightkeeper

Scene Lightkeeper is a system-neutral Foundry VTT v13 module that replaces technical Scene darkness controls with four understandable lighting workflows:

1. **How dark it feels** — 0 is brightest, 100 is pitch black.
2. **Course of the day** — sunrise, day, sunset, and night, with approximate ordinary and Imperial time.
3. **24-hour clock** — exact ordinary time with an ordinary year, month, and day.
4. **Imperial Glocke** — 33 Glocken with Nachtwache, Kronwache, Laternenwache, and Umgang context.

Moonlight and optional calendar-aware seasons complement time-based modes. Global illumination, token vision, fog exploration, and explored-fog reset remain explicit and separate.

## Safe interaction model

Version 1.1.5 retains the safe separation between **looking** and **applying**:

- Merely changing a main mode tab previews that interface without changing the Scene.
- An **Apply lighting** button activates the inspected mode.
- Perceived-darkness presets such as **Bright day** always apply immediately.
- Sliders and fields apply immediately and preview interactively by default.
- World settings can restore immediate mode switching or require Apply for all sliders and fields.
- Changing a side control while inspecting another mode never silently applies the inspected mode.

A five-step help button is available in the full panel, floating board, and settings hub.

## Time and season support

- Course of the day displays approximate ordinary time and approximate Imperial Glocke/watch time.
- 24-hour mode stores ordinary year, month, and day alongside the time.
- Imperial mode stores its 33-month, 33-day date and derives Umgang information.
- Season can be selected manually or derived from the active calendar month:
  - 24-hour mode uses the ordinary 12-month calendar.
  - Imperial mode uses a 33-month calendar.
- Complementary modules can register additional synchronous time displays through the public API.

## Scene-switch lighting synchronization

An optional world-level policy under **Configure Settings → Module Settings → Scene Lightkeeper** provides:

- **Disabled:** every Scene retains its own lighting.
- **Keep illumination grade:** the newly viewed Scene receives exact visible darkness and native global-illumination values while retaining its own time, dates, moon, season, fog, and vision configuration.
- **Keep complete lighting profile:** mode, time or Glocke, both calendar dates, moon, season source, transition, and global illumination are carried to the newly viewed Scene.

A separate option can restore the last remembered lighting on initial login or reload. Rapid Scene changes are coalesced so superseded intermediate Scenes are not rewritten.

## Installation

Extract the install archive so the final manifest path is:

```text
Data/modules/runyth-scene-lightkeeper/module.json
```

Restart Foundry, enable **Scene Lightkeeper**, and enter a world as GM.

## Entry points

- **Left Scene Controls → sun button:** the primary in-canvas launcher.
- **Settings sidebar → Scene Lightkeeper quick launcher:** compact one-click access to the full dashboard or floating board without entering Configure Settings. The visible button labels are deliberately short so they remain inside Foundry’s narrow sidebar; full descriptions remain available as tooltips and accessible names. This entry point remains available even if another module breaks Scene Controls registration.
- **Configure Settings → Module Settings → Scene Lightkeeper:** world and client configuration.
- **Public API:** `game.modules.get("runyth-scene-lightkeeper").api`.


### Settings-sidebar footprint

The quick launcher never grows its action buttons to accommodate text. The standard layout keeps the existing card size but uses short **Dashboard** and **Board** labels with overflow containment. Under **Configure Settings → Module Settings → Scene Lightkeeper → Settings sidebar launcher size**, GMs can choose:

- **Standard (current size)** — the default, preserving the existing logo, hint, and two-column launcher layout.
- **Compact** — a single slim row with a smaller sun logo and icon-only dashboard/board actions. Full action names remain available through tooltips and accessibility metadata.

The launcher-size setting is world-scoped because it controls the shared module UI policy. Changing it updates an already-rendered Settings sidebar immediately.

## Floating board behaviour

The optional floating Lightkeeper Board is deliberately pinned rather than treated as an ordinary disposable application window. After it is opened:

- Escape does not close it.
- Opening sheets, dialogs, dashboards, or other applications does not close it.
- Re-clicking a launcher only focuses it; it does not toggle it closed.
- Scene changes and ordinary interface rerenders do not close it.
- It cannot be minimized.
- If an external interface teardown removes its DOM element, it restores itself while Foundry remains active.
- **Only the X inside the board's own content header closes it.**

The floating board intentionally has no Apply button under the default setting **Slider and field application: Apply immediately**. Its sliders are direct, interactive lighting controls, so an additional confirmation would add friction without changing the result. The board displays this behaviour in plain language. When the global setting is changed to **Stage controls until Apply**, the board shows both **Apply** and **Discard** and no staged value reaches the Scene until Apply is pressed.

## Safety model

- Automatic global-light handling is the default; **Preserve scene setting** remains available.
- Ordinary lighting changes use one contained Scene update.
- Scene-switch synchronization never copies fog exploration, token vision, walls, tokens, Ambient Lights, regions, sounds, weather, or unrelated flags.
- Explored-fog reset is GM-only and confirmed by default; the confirmation can be disabled globally.
- Every major window uses ApplicationV2, is resizable and responsive, and stores client-local geometry; the pinned board is intentionally non-minimizable.
- Closed windows are not force-reopened by delayed updates.
- UI actions contain synchronous errors and rejected Promises.
- All CSS is scoped to module-owned applications.

## Complementary time systems

Register after Scene Lightkeeper exposes its API, or listen for `sceneLightkeeperReady`:

```javascript
Hooks.once("sceneLightkeeperReady", (api) => {
  api.registerTimeSystem({
    id: "example-calendar",
    label: "Example calendar",
    modes: ["phase", "clock", "imperial"],
    order: 100,
    format: ({ minutes, approximate }) => `${approximate ? "about " : ""}${minutes} ticks`
  });
});
```

Formatters must be synchronous. A returned disposer unregisters the display.

## Development

```text
npm run check
npm run package
npm run release:verify
```

The dependency-free suite covers lighting math, both calendars, season derivation, time-system extensions, Scene synchronization, rapid-switch coalescing, every rendered ApplicationV2 action, slider and select wiring, staging semantics, fog confirmation paths, strict unhandled-rejection containment, permissions, localization parity, v13 Scene Controls shape, CSS isolation, and prohibited legacy APIs.

`npm run release:verify` packages three archives twice, validates ZIP paths and runtime/source/documentation separation, tests the extracted source ZIP, rebuilds from it, and requires byte-for-byte reproducibility.

## Compatibility

| Component | Support |
|---|---|
| Foundry VTT | Version 13 only; verified manifest 13.351 |
| Game systems | System-neutral |
| Dependencies | None |
| Languages | English baseline, bundled German, and Foundry-native external language packs |

Official development references:

- https://foundryvtt.com/api/v13/
- https://foundryvtt.com/article/module-development/
- https://foundryvtt.com/article/localization/

Localization contributor guide: [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md)

## Licence
Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
