# Plan 0021 — Existing Codex configuration review

Status: complete

## Goal

Complete the P1 existing-Codex-configuration slice without treating project instructions as trusted
commands or returning their contents. The CLI should identify recognized existing Codex files,
validate only their bounded structural format, and make dry-run output distinguish additions from
replacement conflicts.

## Scope

- Recognize `AGENTS.md`/overrides, Agent Skills, `.codex/config.toml` and custom-agent TOML files.
- Read only recognized files, with a bounded size, when `analyze --config` or `generate --dry-run`
  explicitly requests the review.
- Return path, type and safe status (`present`, `valid`, `malformed`, `skipped`) only; never return
  raw instructions, descriptions, TOML values or source content.
- Add deterministic dry-run changes with `add` or `replace` actions alongside existing collision and
  conflict categories. Never modify the source project.

## Files expected to change

- `src/existing-config.ts`, `src/core.ts`: pure structural parser and dry-run change contract.
- `scripts/cli.mjs`: bounded recognized-file reads and `--config`/dry-run integration.
- `tests/existing-config.test.mjs`, `tests/cli-integration.test.mjs`: valid/malformed, size and
  nondisclosure fixtures.
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, this plan and `README.md`.

## Security risks and controls

- Existing instructions are untrusted data and are never executed or injected into generated output.
- Only safe relative allowlisted paths are read; symlinks, private paths, traversal and oversized files
  are skipped before content parsing.
- Parsers emit booleans/statuses and path categories only. Tests assert that hostile content and TOML
  values do not appear in reports.
- Dry-run is read-only and reports staging collisions separately from source-project replacements.

## Verification

- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run check`
- `git diff --check`
- Negative fixtures for malformed frontmatter/TOML, traversal, oversized files and injected text.

## Result

- `analyze --config` reports safe statuses for recognized existing Codex files.
- `generate --dry-run` includes `add`/`replace` changes while retaining separate staging collisions
  and source-project conflict categories.
- All reports are content-free and the source project remains untouched.
