# Plan 0008 — Harden inventory scanner

Status: complete

## Objective

Strengthen CLI inventory boundaries for symlinks, hidden directories, traversal limits and scan
feedback without reading arbitrary project source.

## Scope

- Resolve and verify the selected root and every accepted filesystem entry remains inside it.
- Reject symlinks, sensitive paths and hidden directories by default; retain `.github` for workflow
  detection.
- Make depth/file limits explicit and report when the scanner truncates its inventory.
- Add CLI integration fixtures for hidden paths, symlink escape and depth limits.

## Security/data-flow considerations

- The selected root is the only approved filesystem scope.
- `realpath` is used for containment checks; symlink entries are never read as manifests or source.
- Warnings must not include raw private file contents.
- The scanner remains metadata-only and must not execute project files.

## Verification

- `npm run check`
- `git diff --check`
- CLI fixtures must show that safe files are retained and unsafe files are omitted.

## Rollback

Revert scanner changes, tests and this plan. No user project files are modified.

## Progress

- [x] Plan written before implementation.
- [x] Harden scanner and propagate truncation warnings.
- [x] Add negative fixtures and record checks: `npm run check` passed (18 tests); `git diff --check` passed.
