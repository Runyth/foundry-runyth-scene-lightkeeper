# Scene Lightkeeper 1.1.3 Build Report

## Release type

Patch release focused on localization architecture, translator extensibility, and localization quality gates.

## Finding

Scene Lightkeeper 1.1.2 was already using Foundry VTT's native modular localization system:

- `module.json` declared standard `languages` entries.
- English and German were stored independently in `lang/en.json` and `lang/de.json`.
- Runtime JavaScript used `game.i18n.localize` and `game.i18n.format`.
- Handlebars templates used Foundry's `{{localize}}` helper.

No private language setting was required or appropriate. Foundry selects the client language globally and loads active package dictionaries for that language.

## Changes

- Bumped module and API version to 1.1.3.
- Retained English as the complete first/default localization contract.
- Retained German as a separate bundled language pack.
- Localized the remaining first-run title and settings-hub footer.
- Removed the now-unused hard-coded module-title constant.
- Added `docs/LOCALIZATION.md` for bundled and independent language packs.
- Added `tools/check-localization.mjs` as an explicit release gate.
- Added `tests/localization.test.mjs` with five executable localization-contract tests.
- Generalized the static audit to inspect every manifest-declared language instead of hard-coding English and German.
- Added release-gate requirements for the localization tests and documentation.
- Kept language switching out of the dashboard, floating board, panel, and module settings because Foundry already provides the native language interface.

## Validation

- 80/80 automated tests passed.
- 16/16 production JavaScript modules passed syntax validation.
- 20 runtime source files passed the Foundry v13 compatibility audit.
- 2 modular language packs passed validation.
- 188/188 namespaced keys exist in both bundled languages.
- All formatting placeholders match the English baseline.
- No hard-coded alphabetic user-facing template text was detected.
- No module-specific language selector or dashboard language action was detected.

See `VALIDATION_1.1.3.txt` for the complete output and `LOCALIZATION.md` for the extension contract.
