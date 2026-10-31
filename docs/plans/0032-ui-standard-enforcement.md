# Plan 0032 — Enforce the UI design standard

Status: implemented. Updated: 2026-10-31.

## Objective

Apply the adopted UI standard to the current browser prototype and make the offline, typography,
color-token and basic accessibility requirements fail the test suite when regressed.

## Scope

- Keep the existing inline static-page CSS and CSP boundary.
- Replace one-off visual values with named UI tokens and add the approved local font fallback.
- Add visible keyboard focus styling.
- Add a deterministic static UI test for semantic structure, font fallback, tokens and external-asset
  absence.
- Do not change project scanning, generation, target capabilities or data-flow behavior.

## Security and data-flow assessment

- No new filesystem, network, provider, MCP or execution call is introduced.
- The test rejects external font and asset references so the offline boundary is less likely to
  regress through a UI-only change.
- The existing CSP, allowlist and local File API behavior remain unchanged.

## Verification

- `npm run check` passed: 62 tests, including the new UI baseline test; Skill, capability registry
  and target snapshot checks also passed.
- `npm run pages` passed and produced the static package without adding assets.
- `git diff --check` passed.
- The existing local browser boundary test passed for static serving, CSP, allowlisted assets and
  denied external/request paths. Full pointer-level browser interaction remains a manual check.

## Rollback

Revert the UI token/fallback changes, the static UI test and this plan. No user project files or
generated artifacts are modified.
