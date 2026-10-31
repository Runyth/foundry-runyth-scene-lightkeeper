# Build Report 1.1.1

Date: 2026-08-02

## Correctness changes

- Fixed all nonfunctional full-panel buttons caused by incorrect ApplicationV2 callback binding assumptions.
- Centralized UI action error containment across the full panel, floating board, settings hub, and Scene Controls.
- Removed an unreachable floating-board action discovered by template/action parity testing.
- Hardened synchronous live-preview animation handling and malformed Scene Controls inputs.

## Expanded quality gates

The 57-test suite now directly invokes each action callback with the exact ApplicationV2 instance binding used by Foundry. It also verifies:

- every rendered `data-action` has a mapped handler;
- no mapped action is absent from its template;
- all full-panel buttons execute and mutate the intended Scene fields;
- floating-board and settings-hub buttons execute;
- Scene Controls tools execute;
- action errors are reported and never escape as unhandled rejections;
- all range/select controls receive both `input` and `change` listeners;
- field conversion and nested Imperial date patches are correct;
- quick controls reach the Scene service;
- live preview tolerates a synchronous animation return;
- arrays passed to the v13 Scene Controls hook are ignored safely.

The release pipeline now runs tests with strict unhandled-rejection handling, verifies source/version consistency, packages independently twice, validates ZIP integrity and layout, reruns all checks from the extracted source ZIP, and requires byte-identical reconstruction.
