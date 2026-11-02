# Plan 0040 — Runtime verification evidence contract

Status: implemented

## Objective

Define a versioned, offline-validated evidence format for target runtime verification without
pretending that format fixtures prove runtime loading or permission enforcement.

## Facts

- UAA currently has format-level fixtures and validators for five target families.
- The target CLIs/runtimes are not required by, and are not available for, the offline test suite.
- Compatibility status must remain `partial` until independent runtime evidence exists.
- Runtime transcripts, source excerpts, credentials and personal paths must not be stored in
  repository evidence.

## Scope

1. Add a `runtime-verification-evidence-0.1` JSON Schema and pure TypeScript validator.
2. Define capability levels that distinguish `format-verified` from `runtime-verified`.
3. Add a metadata-only partial Codex fixture, an offline checker and regression tests.
4. Document the clean-project verification workflow, promotion rules and disclosure limits.
5. Add the checker to `npm run check` without network or target CLI requirements.

## Out of scope

- Launching Codex, Claude Code, Gemini CLI, Antigravity or ChatGPT.
- Automatically changing capability registry status.
- Storing raw logs, source, prompts, credentials, personal paths or cloud responses.
- Adding a runtime sandbox, network access or provider connector.

## Security/data-flow review

Evidence is untrusted metadata supplied by a user or future test harness. The validator checks
bounded identifiers, dates, target names, capability levels and status consistency. It does not
interpret evidence text as instructions and does not execute referenced commands. Evidence files
contain only IDs, statuses and bounded limitations.

## Verification

- `npm run check`
- `git diff --check`
- Valid partial fixture passes offline.
- Inconsistent `verified` evidence, unknown capabilities, unsafe IDs and oversized text fail closed.

Completed on 2026-11-01:

- `npm run check`: passed, 76 tests; Skill frontmatter, capability registry, target snapshots and runtime evidence passed.
- `git diff --check`: passed.
- No target CLI, network, raw project content or runtime transcript was used.

## Rollback

Revert the schema, validator, checker, fixture, tests and documentation. Existing generation and
capability claims remain unchanged.
