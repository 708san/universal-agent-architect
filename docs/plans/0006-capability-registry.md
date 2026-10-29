# Plan 0006 — Capability registry snapshot

Status: in progress

## Objective

Introduce a versioned, offline-readable capability registry that distinguishes verified, partial,
planned and unknown target behavior without inventing native features.

## Scope

- Add a `capability-registry-0.1` JSON Schema.
- Add an initial local snapshot for the five product target families.
- Add an offline checker that rejects duplicate targets, invalid statuses and verified claims without
  source URLs and fixtures.
- Link the registry to the compatibility and architecture documentation.

## Facts and assumptions

- This slice uses the existing compatibility table and URLs; it performs no network access.
- Entries without an official source URL or fixture remain `planned` or `unknown`.
- A registry snapshot is not automatically the latest specification. Updates require an explicit review
  workflow described by the repository policy.

## Security/data-flow considerations

- Registry data is local data, not executable instructions.
- Do not fetch or execute remote content during the checker.
- Do not mark a target feature verified based on marketing text or an untested example.

## Verification

- `npm run check`
- `git diff --check`

## Rollback

Revert the schema, snapshot, checker, tests and documentation links. No user project files are changed.

## Progress

- [x] Plan written before implementation.
- [x] Add schema, snapshot and checker.
- [x] Add tests and documentation links.
- [x] Record offline checks: `npm run check` passed (16 tests); `git diff --check` passed.
