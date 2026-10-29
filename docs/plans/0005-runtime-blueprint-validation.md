# Plan 0005 — Runtime Blueprint validation

Status: complete

## Objective

Make artifact generation fail closed when a Blueprint does not conform to the versioned `0.1` contract,
instead of relying only on TypeScript types or a documentation-only JSON Schema.

## Scope

- Add a dependency-free `validateBlueprint(unknown)` function to the pure core.
- Harden security requirement validation against malformed runtime data.
- Reject invalid Blueprints before target rendering.
- Add offline negative tests for malformed Blueprint and security arrays.

## Security/data-flow considerations

- Blueprint values may come from files, a future MCP, or optional model output; treat them as untrusted.
- Validation must not execute code, read files, or make network calls.
- Failures must return findings without echoing raw private content.

## Verification

- `npm run check`
- `git diff --check`

## Rollback

Revert the core validator, tests and this plan. No user project files are changed.

## Progress

- [x] Plan written before implementation.
- [x] Implement validator and fail-closed rendering.
- [x] Add negative tests and record checks.
