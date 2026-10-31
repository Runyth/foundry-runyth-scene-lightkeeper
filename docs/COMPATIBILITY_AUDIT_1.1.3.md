# Foundry VTT v13 Compatibility Audit — 1.1.3

## Scope

This patch re-audited the complete runtime module and specifically reviewed localization against Foundry VTT v13's native package localization system.

## Localization architecture

- `module.json` uses the standard `languages` array.
- English is first and acts as the full source-of-truth.
- Language paths follow `lang/<language-code>.json`.
- Every key is namespaced under `SLK.`.
- JavaScript uses `game.i18n.localize` or `game.i18n.format`.
- ApplicationV2 titles use localization keys.
- Handlebars templates use `{{localize}}`.
- Foundry controls the active client language; Scene Lightkeeper does not register a competing setting.
- Additional bundled languages can be added through the manifest.
- Independent translation modules can provide matching `SLK.*` keys for further Foundry languages.

## Compatibility checks

- Foundry compatibility remains minimum 13, verified 13.351, maximum 13.
- ApplicationV2 and DialogV2 usage remains unchanged.
- v13 record-shaped Scene Controls remain in use.
- No V1 Application, jQuery listener, legacy `controls.push`, `this.run`, socketlib, or prohibited global API pattern was introduced.
- CSS remains fully scoped to `.slk-` selectors.
- Runtime imports and manifest paths resolve.
- Localization dictionary paths resolve from the module root.
- English and German dictionaries contain identical keys and placeholder contracts.
- No module-specific language selector was added to settings or UI templates.

## Result

Passed. Version 1.1.3 uses Foundry's standard localization mechanism and is structurally open to additional bundled or complementary language packs without dashboard changes.
