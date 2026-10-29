# Plan 0004 — Blueprint schema and release readiness

Status: completed for the initial schema and gate-document slice; runtime enforcement remains planned

## Objective

Define the machine-readable contract for the canonical `Blueprint` and the minimum
security/operations gates required before calling the tool production-ready.

## Facts

- `src/core.ts` currently emits `Blueprint.schemaVersion: "0.1"`.
- The core already records deterministic security requirements and test identifiers.
- Only the Codex renderer is implemented; other target names remain explicit prototype warnings.
- The product specification excludes a universal agent runtime and autonomous generated-skill execution
  from the initial milestone.

## Assumptions

- JSON Schema is a documentation and validation contract; it does not enforce permissions at runtime.
- The first schema describes the current `0.1` Blueprint rather than introducing a migration system.
- Release readiness is a gate for this repository and generated-agent workflows, not a claim that every
  target adapter is production-ready.

## Scope

- Add `schemas/blueprint-0.1.schema.json` for the canonical Blueprint.
- Add `docs/RELEASE_READINESS.md` with security, functionality, operations and compatibility gates.
- Add an offline test that checks the schema covers the emitted Blueprint shape and required security fields.
- Link the schema and release gates from the architecture and roadmap documents.

## Out of scope

- Runtime sandboxing, credential storage, MCP authorization, cloud connectors or new target adapters.
- Automatic schema fetching or network-based validation.
- Applying generated artifacts to a user's project.

## Security and data-flow risks

- Schema validation can prove structure, not that a target runtime enforces network or tool permissions.
- Release gates must distinguish repository tests from end-to-end protection claims.
- Do not include source contents, secrets or credentials in fixtures or reports.

## Verification

- `npm run check`
- `git diff --check`
- Load the schema and assert its required top-level fields, security enum values and generated Blueprint
  compatibility using only local Node.js APIs.

## Rollback

Revert the schema, readiness document, links and test as one isolated commit. No user project files or
generated artifacts are modified.

## Progress

- [x] Plan written before implementation.
- [x] Schema and release-readiness document added.
- [x] Tests and documentation links updated.
- [x] Offline checks recorded: `npm run check` passed (14 tests); `git diff --check` passed.
