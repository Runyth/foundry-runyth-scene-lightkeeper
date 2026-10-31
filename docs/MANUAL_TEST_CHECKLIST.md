# Manual Runtime Test Checklist

Run in a copy of the target world on Foundry VTT 13.351.

## Core lifecycle

- Enable the module, reload, and verify no console error is attributed to Scene Lightkeeper.
- Disable and re-enable it; verify no duplicate left controls, windows, listeners, or time-system rows.
- Verify English is the complete default interface when Foundry uses English.
- Change Foundry's own client language to German, reload, and verify the panel, floating board, settings hub, first-run title, dialogs, notifications, settings names, and hints are translated.
- Verify there is no Scene Lightkeeper-specific language setting or dashboard language switch.
- Enable a test translation add-on module that supplies `SLK.*` keys for another language and verify Foundry loads it without changing Scene Lightkeeper.
- Confirm the manifest reports version 1.1.5 and compatibility 13–13.
- Keep the console open and confirm no `this.run is not a function`, unhandled rejection, or Lightkeeper stack trace occurs.

## Discoverable access

- Verify the left Scene Controls sun group opens the full dashboard and opens/focuses the floating board.
- Open Foundry's ordinary Settings sidebar and verify the **Scene Lightkeeper** quick launcher appears without entering Configure Settings.
- Use both quick-launcher buttons and verify they open the full dashboard or open/focus the floating board.
- Rerender the Settings sidebar repeatedly and verify the quick launcher is present exactly once.
- Verify the launcher is GM-only.
- In the default **Standard (current size)** launcher mode, verify the two visible action labels are short and remain fully inside their existing buttons at normal Foundry sidebar widths.
- Resize the browser through narrow sidebar layouts and verify neither launcher label can escape its button; unusually long translation strings must truncate rather than expand the card.
- Verify hovering/focusing each launcher action still exposes the complete action meaning despite the short visible label.
- Change **Settings sidebar launcher size** to **Compact** in global module settings and verify the card immediately collapses to one slim row with a reduced sun logo and two icon-only actions.
- Verify Compact mode does not increase sidebar width or button size and that both actions retain native tooltips/accessible names.
- Return the launcher setting to Standard and verify the original-sized logo/card returns immediately.
- With a deliberately incompatible module that throws during `getSceneControlButtons`, verify the independent Settings-sidebar launcher remains usable after the sidebar renders.

## Pinned floating board

- Enable and open the floating board. Press Escape repeatedly and verify it remains open.
- Open and close actor sheets, item sheets, journals, dialogs, module dashboards, Configure Settings, and sidebar tabs; verify the board remains open.
- Click every Lightkeeper launcher repeatedly; verify the existing board comes to the front and is never toggled closed.
- Switch Scenes, trigger canvas redraws, resize the browser, change tabs, return focus to Foundry, and verify the board remains open.
- Verify the board has no minimize control and its native ApplicationV2 frame close control is hidden and unfocusable.
- Simulate an external DOM teardown and verify the board restores itself while Foundry is ready and visible.
- Verify generic `close()` requests cannot close the board.
- Click the X inside the board's own content header and verify it closes without immediately restoring.
- Reopen it through any launcher and verify its saved position and size return.
- With **Slider and field application** set to immediate, verify the board explicitly says sliders apply immediately and correctly omits Apply/Discard.
- Change the setting to staged, verify Apply/Discard appear, adjust multiple controls, and verify only Apply commits them.

## Default mode-preview workflow

- Keep **Lighting-mode button behaviour** at its default **Preview mode; require Apply**.
- Apply a distinctive current state, then click each of the four mode tabs without touching its controls.
- Verify the tab content changes but Scene darkness, global light, current saved mode, and player view do not change.
- Verify the currently applied tab retains its check marker while the inspected tab is highlighted separately.
- Click **Apply lighting** and verify the inspected mode is applied once.
- Click another tab, then **Discard**, and verify the Scene remains on the previous mode.
- Change moon, season, season source, global-light mode, cutoff, or transition while inspecting a different tab. Verify that side control applies to the current Scene state without activating the inspected tab.
- Change **Lighting-mode button behaviour** to immediate and verify clicking a tab restores the pre-1.1.2 behaviour.

## Slider and preset application

- Keep **Slider and field application** at its default immediate setting.
- Drag each primary slider and verify darkness previews interactively and commits on change.
- Drag moon and global-light cutoff and verify their displayed values remain descriptive and accurate.
- Verify Bright day, Overcast, Twilight, Dark night, and Pitch black always apply immediately.
- Change **Slider and field application** to staged.
- Adjust several sliders and fields; verify the Scene and players remain unchanged while the panel shows pending state.
- Apply once and verify all staged values commit together.
- Discard staged values and verify the Scene remains unchanged.
- Repeat staged Apply/Discard from the floating board.
- While staged mode is enabled, verify perceived-darkness presets still apply immediately and clear obsolete staged state.

## Time and calendar presentation

- In Course of the day, verify ordinary approximate time and Imperial Glocke/watch time appear together.
- Move the Course of the day slider across sunrise, midday, sunset, and night; verify both time equivalents advance coherently.
- In 24-hour mode, set ordinary year, month, day, and time; close/reopen and verify persistence.
- In Imperial mode, set Imperial year, month, day, and Glocke; verify watch, bell-in-watch, Umgang, and ordinary equivalent.
- Verify Glocken 1, 11, 12, 22, 23, and 33 map to the intended watches.
- Verify Imperial days 1, 11, 12, 22, 23, and 33 map to the intended Umgänge.

## Season source

- Select manual season and verify spring, summer, autumn, and winter alter time-based dawn/dusk as expected.
- In 24-hour mode, select calendar-derived season and test months 1, 3, 6, 9, and 12.
- In Imperial mode, select calendar-derived season and test months 1, 9, 17, 25, and 33.
- Inspect Feeling or Course of the day and verify calendar season cannot be newly selected there because no calendar owns those modes.
- Switch back to 24-hour or Imperial mode and verify the saved calendar setting resumes.
- Disable seasonal calculations globally and verify date/season fields no longer alter darkness.

## Complementary time-system API

- Enable a small test integration that registers a time system before `sceneLightkeeperReady` completes.
- Verify its row appears only in configured modes and in configured order.
- Verify `approximate` is true in Course of the day and false in exact clock/Glocke modes.
- Register one formatter that throws and one that returns a Promise; verify both are skipped with warnings while valid rows still render.
- Invoke the disposer and verify the row disappears without reopening closed windows.
- Reload with the complementary module disabled and verify no stale row remains.

## Fog and vision

- Toggle token vision independently of fog exploration.
- Toggle fog exploration independently of token vision.
- With confirmation enabled, choose Cancel during explored-fog reset and verify exploration remains.
- Confirm reset and verify explored fog clears.
- Trigger reset from both the full panel and Scene Controls; verify the same dialog and result.
- Disable confirmation globally and verify reset performs directly.
- Attempt reset without GM permission or against a non-active Scene and verify a clean error.

## Terse guide

- Open the question-mark guide from the full panel, floating board, and settings hub.
- Verify it explains direct access, choosing a mode, adjusting controls, Apply semantics, presets, pinned-board closure, and fog reset in five short steps.
- Close via its button, window close control, and Escape; verify no error or blocked window occurs.

## Scene-switch synchronization

- Leave synchronization disabled and verify two Scenes retain independent lighting.
- Enable **Keep illumination grade**, configure Scene A, then view Scene B. Verify exact darkness and global-light min/max are copied.
- Verify grade mode preserves Scene B's time, both dates, moon, season source, fog, and vision.
- Enable **Keep complete lighting profile** and verify time/Glocke, both dates, moon, season, season source, transition, and global light are copied.
- Verify walls, tokens, Ambient Lights, regions, sounds, weather, ownership, and unrelated flags remain unchanged.
- Switch rapidly A → B → C and verify superseded B is not needlessly rewritten while C receives the carried illumination.
- Return to an already matching Scene and verify no unnecessary update.
- Test initial-load restoration both enabled and disabled.
- Repeat with two GM clients and verify no unhandled error; the last intentional GM update should win.

## Windows and layout

- Move and resize the full panel, floating board, and settings hub; close, reload, and verify geometry restoration.
- Reset layout while all three are open; verify safe defaults apply immediately and stale positions do not return later.
- Change browser/monitor dimensions and verify off-screen geometry is clamped.
- Verify narrow windows wrap controls, keep text inside buttons, and retain accessible native window controls.
- Start an update and immediately close the panel; verify delayed refresh does not reopen it.

## Permissions and data safety

- Verify a user lacking Scene update permission sees mutation controls disabled.
- Attempt API mutations as that user and verify clean rejection.
- In Preserve global-light mode, verify darkness changes do not write native global-light fields.
- Test Automatic, Always, and Off, then return to Preserve.
- Verify normal lighting changes do not alter fog, token vision, walls, Ambient Lights, tokens, regions, sounds, weather, ownership, or unrelated flags.

## Module interference

- Test with representative UI, scene-navigation, lighting, weather, vision, and `getSceneControlButtons`-modifying modules.
- Verify Lightkeeper continues using the v13 record control shape and never calls `controls.push(...)`.
- Verify malformed third-party control data does not make Lightkeeper throw.
- Verify unrelated module errors remain attributable to their originating package and are not suppressed.
