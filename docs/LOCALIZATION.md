# Localization

Scene Lightkeeper uses Foundry VTT's native package-localization system. It does not maintain a private language setting or render a language switch in its panel, floating board, or settings hub.

## Baseline and bundled languages

- `module/lang/en.json` is the complete English source-of-truth and fallback contract.
- `module/lang/de.json` is the bundled German translation.
- `module/module.json` declares both files through Foundry's standard `languages` array.
- All runtime text uses namespaced `SLK.*` keys through `game.i18n.localize`, `game.i18n.format`, ApplicationV2 title keys, or Handlebars `{{localize}}`.

Foundry selects the active language for the whole client. Scene Lightkeeper follows that selection automatically; no module-specific language control is needed.

## Add another bundled language

1. Copy `module/lang/en.json` to `module/lang/<code>.json`.
2. Translate values only. Preserve every `SLK.*` key and every `{placeholder}` exactly.
3. Add a standard entry to `module/module.json`:

```json
{
  "lang": "fr",
  "name": "Français",
  "path": "lang/fr.json"
}
```

4. Run `npm run check`. The localization gate rejects missing keys, extra keys, invalid paths, empty values, unnamespaced keys, and placeholder mismatches.

## Publish an independent language-pack module

A complementary translation module can provide a new language without changing Scene Lightkeeper. Its own manifest declares the language and its JSON file provides the same `SLK.*` keys. Foundry merges translations from active modules into the selected language dictionary.

Recommended relationship entry for the language-pack manifest:

```json
{
  "relationships": {
    "requires": [
      {
        "id": "runyth-scene-lightkeeper",
        "type": "module",
        "compatibility": {
          "minimum": "1.1.3"
        }
      }
    ]
  }
}
```

Use `module/lang/en.json` from the matching Scene Lightkeeper release as the translation contract.

## User language selection

Use Foundry's own language configuration. Scene Lightkeeper changes language with the rest of Foundry after the client reloads. There is intentionally no dashboard language selector and no Scene Lightkeeper-specific world setting.
