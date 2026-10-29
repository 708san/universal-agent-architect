# Plan 0009 — Golden CLI/browser fixtures

Status: in progress

## Objective

Make the browser and CLI use the same safe project-input normalization and prove that the same golden
fixture produces equivalent facts, Blueprint decisions and artifact validation outcomes.

## Scope

- Extract browser File API input conversion into a small browser-compatible helper.
- Add the helper to the static server allowlist and use it from the browser page.
- Add an offline golden test using `tests/fixtures/sample-python.json`.

## Security/data-flow considerations

- The helper receives only user-selected File-like entries and reads text only for allowlisted root
  manifests under the existing size limit.
- It must preserve path filtering and never include source contents in facts or reports.
- No network, filesystem API or provider call is added to the browser helper.

## Verification

- `npm run check`
- `git diff --check`
- Browser-derived and CLI-derived golden results must match.

## Rollback

Revert the browser helper, page/server wiring, test and this plan. No user project files are modified.

## Progress

- [x] Plan written before implementation.
- [x] Extract helper and wire static page.
- [x] Add golden convergence test and record checks: `npm run check` passed (19 tests); `git diff --check` passed.
