# Plan 0015 — Dry-run conflict report

Status: complete

## Objective

Make the CLI dry-run explain conflicts between proposed target files and existing project
instructions, Skills and Codex settings before any staging output is written.

## Scope

- Add a pure conflict-report helper that maps generated paths to existing safe project paths.
- Include source-project conflicts separately from staging-directory collisions in CLI dry-run output.
- Keep normal generation staging-only and preserve refusal to overwrite existing staging files.
- Add integration fixtures for conflicts, no-write behavior and private-path exclusion.

## Security/data-flow review

- Input: scanner-produced relative paths only; no existing instruction or source contents are read.
- Processing: safe-path filtering and exact relative-path comparison in the pure core.
- Output: dry-run JSON contains relative filenames and findings, never file contents or absolute paths.
- Writes: dry-run creates no directory and performs no write; normal generation remains isolated under `generated/`.

## Verification

- `npm run check`
- `git diff --check`
- Existing source conflicts are reported without modifying source or staging output.

## Rollback

Revert the conflict helper, CLI report, tests and this plan. No user project files are modified.

## Progress

- [x] Read product/architecture constraints and complete security data-flow review.
- [x] Add pure conflict reporting and CLI dry-run fields.
- [x] Add tests and record checks: `npm run check` passed (28 tests); `git diff --check` passed.
