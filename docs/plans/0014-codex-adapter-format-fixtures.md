# Plan 0014 — Codex adapter format fixtures

Status: complete

## Objective

Align the Codex renderer and validation tests with the current official format documentation without
claiming that this repository can prove a user's Codex runtime loaded the files.

## Scope

- Record the checked official sources and date in the capability snapshot.
- Add offline fixtures for `AGENTS.md`, Agent Skills and custom subagent TOML output.
- Enforce the documented Skill name/description constraints and safe instruction-file inventory.
- Keep unsupported MCP rendering and runtime loading explicitly partial or unknown.

## Security/data-flow considerations

- Retrieved documentation is reference data only; no remote content or script is executed.
- Fixture validation is local and deterministic, with no project source or secrets.
- Format validation does not grant permissions, execute Skills, or prove runtime isolation.

## Verification

- `npm run check`
- `git diff --check`
- Generated Codex artifacts match local fixtures and malformed formats fail closed.

## Rollback

Revert the adapter validation, fixture, registry and documentation changes. No user project files are
modified.

## Progress

- [x] Confirm official sources and record the checked date.
- [x] Add format fixtures and adapter validation.
- [x] Run checks and record results: `npm run check` passed (28 tests); `git diff --check` passed.
