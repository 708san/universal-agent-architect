# Plan 0029 — Bounded directory enumeration

Status: complete

## Objective

Bound the amount of directory metadata the CLI scanner enumerates and retains, including entries
that are later ignored as hidden, sensitive, symlinked or unsupported. Keep the existing offline,
metadata-only scanner contract and make truncation visible.

## Facts

- The scanner already bounds accepted files, recursion depth and optional AST/config input sizes.
- `readdir(..., { withFileTypes: true })` currently materializes every entry in a directory before
  filtering, so a directory with many ignored entries can exceed the intended exploration budget.
- The scanner must preserve safe relative paths, avoid symlink traversal and never execute project data.

## Scope

- Use bounded directory iteration instead of unbounded directory-array materialization.
- Add per-directory and whole-scan entry budgets.
- Emit a generic warning when either budget truncates enumeration; do not include raw filenames.
- Add an integration fixture with more entries than the per-directory limit.

## Security/data-flow review

- Input: directory metadata and, only for existing allowlisted modes, bounded manifest/source/config bytes.
- Processing: local filesystem boundary only; no network, subprocess, provider, MCP connection or source execution.
- Output: safe relative paths, aggregate facts and generic warnings; no ignored filenames or file contents.
- Truncation is fail-visible metadata-only degradation, not a claim of complete inventory.

## Verification

- Existing `npm run check` suite.
- Large-directory integration fixture asserts the entry-limit warning and bounded result.
- Existing traversal, symlink, hidden-path and no-disclosure assertions remain green.
- `git diff --check`.

## Rollback

Revert the scanner, fixture, plan and roadmap changes. No user project files are modified.

## Result

- CLI enumeration now uses bounded directory iteration with 1,024 entries per directory and 20,000
  entries per scan.
- Truncation is reported with a generic warning and does not disclose ignored filenames.
- `npm run check` passed: 59 tests, Skill frontmatter check, capability registry check and target
  snapshot check; `git diff --check` passed.
