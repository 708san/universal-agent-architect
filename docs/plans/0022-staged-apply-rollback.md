# Plan 0022 — Staged apply and rollback

Status: complete

## Goal

Add a local CLI workflow that can preview generated artifacts, require an explicit confirmation flag
before modifying a project, preserve replaced files in a rollback record, and restore or remove only
the files created by that apply operation.

## Scope

- Keep `generate` as a staging-only operation and add read-only `apply` preview output.
- Require `--confirm` for apply and `rollback`; without it, no project file is written.
- Accept only a staging directory under the current `generated/` root with a valid generation manifest.
- Reject unsafe artifact paths, symlinked project roots/parents/targets and invalid staging manifests.
- Back up replaced files into a staging-local rollback record before applying; record additions for safe
  removal during rollback.
- Make writes via temporary files and rename, never execute generated content or overwrite without the
  explicit command confirmation.

## Files expected to change

- `src/apply.ts`, `scripts/cli.mjs`: pure apply-plan contract and filesystem adapter.
- `tests/apply.test.mjs`, `tests/cli-integration.test.mjs`: preview, consent, backup, rollback and
  traversal/symlink negative tests.
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, `README.md`.

## Security risks and controls

- Applying generated instructions is a filesystem mutation; require an explicit `--confirm` flag and
  show the complete bounded plan first.
- Treat staging and project files as untrusted data; validate the generation manifest and paths, never
  execute scripts or interpret instructions.
- Keep backup data in the staging directory, never report raw file contents, and reject symlink escapes.
- Rollback is scoped to the recorded operation and requires a separate explicit confirmation.

## Verification

- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run check`
- `git diff --check`
- Temporary-project integration tests prove preview/no-write, explicit apply, replacement backup,
  rollback, traversal rejection and symlink rejection.

## Result

- `apply` previews by default and requires `--confirm` to mutate the project.
- Replacements are backed up under a staging-local rollback record; additions are recorded for removal.
- `rollback` is separately previewable and confirmation-gated.
