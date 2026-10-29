# Plan 0010 — Existing configuration inventory and dry-run

Status: in progress

## Objective

Detect known agent configuration files as metadata and provide a no-write preview of generated output
collisions before any staged artifact is written.

## Scope

- Extend `ProjectFacts` with safe paths for existing instructions, Skills and Codex settings.
- Add a pure output-collision helper.
- Add `generate ... --dry-run` to the CLI; it reports proposed files and collisions without writing.
- Add tests for existing configuration detection and dry-run no-write behavior.

## Security/data-flow considerations

- Existing agent files are untrusted data; this slice records paths only and does not execute or expose
  their contents.
- Dry-run must not create directories, overwrite files or read arbitrary source.
- Collision detection must reject unsafe output paths rather than normalize them into approval.

## Verification

- `npm run check`
- `git diff --check`
- CLI dry-run leaves both the source project and generated output unchanged.

## Rollback

Revert the core fields, CLI flag, tests and this plan. No user project files are modified.

## Progress

- [x] Plan written before implementation.
- [x] Add metadata inventory and dry-run behavior.
- [x] Add tests and record checks: `npm run check` passed (22 tests); `git diff --check` passed.
