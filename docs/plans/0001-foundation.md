# Plan 0001 — Offline-first foundation

Status: local foundation complete; external issue/settings setup and target runtime evidence remain open. Updated: 2026-11-01.

## Outcome
Reproducible minimal core working in Node CLI and static browser, with no cloud dependencies. Codex can begin from existing instructions and issues.

## Implemented
- Pure TS core: safe path filtering, limited manifest detection, deterministic blueprint and basic Codex rendering.
- CLI inventory and isolated output directory, browser folder selector and local HTTP preview.
- Focused root instructions, 3 optional read-only custom subagents, 4 portable skills.
- Initial security and compatibility documentation; baseline node tests.
- Bounded input warnings, browser/CLI relative-path normalization coverage, and golden fixture integration tests.

## Remaining before closing P0
- Create or update GitHub issues and verify repository security settings through the external Web UI.

The local P0 implementation is complete: scanner edge cases, static-hosting/CSP/no-outgoing-request
checks, lockfile-based CI, browser ZIP import/export and CLI/browser convergence are covered by the
current test suite. Target runtime loading remains a P1 compatibility-evidence task.

## Risks
- Metadata/folder names may contain secrets and can leak if later returned to cloud AI.
- Regex/manifest scanning does not establish code semantics.
- Codex-specific output is only partially verified; other targets are explicitly unsupported.

## Verification
- `npm run check` passes locally with 73 tests, the skill checker, capability-registry checker and target snapshot checker.
- GitHub Actions `CI` succeeded for the pushed `main` commit.
- `node scripts/cli.mjs analyze examples/sample-python` produces no raw secret contents.
- `node scripts/cli.mjs generate examples/sample-python codex` stages outputs without changing the source.
- Browser prototype opens with `npm run serve`; no `fetch` or third-party scripts.
