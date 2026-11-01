# Plan 0037 — Reject duplicate Blueprint output IDs

Status: implemented

## Objective

Reject duplicate Skill IDs during Blueprint validation so generated artifacts cannot reach
the renderer with duplicate output paths. Keep the existing deterministic output-collision
checks as defense in depth.

## Facts

- Skill IDs become directory names in every generated target.
- `validateArtifacts` detects duplicate paths after rendering, but `generateArtifacts` can
  currently return a supported result before that later validation is called.
- A duplicate Skill ID is untrusted Blueprint data and must fail closed before rendering or
  staging.

## Scope

1. Require Skill IDs to be unique in `validateBlueprint`.
2. Add a regression test proving duplicate IDs produce `supported: false` and no files.
3. Keep post-render duplicate-path validation unchanged as defense in depth.
4. Record the boundary in the security test list if needed.

## Out of scope

- Changing Skill naming rules or target formats.
- Adding runtime permissions, network access or automatic deduplication.
- Silently renaming user-provided or generated Skills.

## Files

- `src/core.ts`
- `tests/core.test.mjs`
- `docs/plans/0037-blueprint-output-collision.md`

## Data-flow and security review

Untrusted Blueprint → duplicate-ID validation → target renderer → staged artifacts.
The new check stops duplicate IDs at the first boundary. No filesystem, network, MCP or
external AI operation is involved.

## Verification

- `npm run check`
- `git diff --check`
- Positive generation remains deterministic.
- Duplicate Skill IDs fail closed with an empty artifact list.

Completed on 2026-11-01:

- `npm run check`: passed, 72 tests; Skill frontmatter, capability registry and target snapshots passed.
- `git diff --check`: passed.

## Rollback

Revert the validator, test and plan. No user project files or Git history are modified.
