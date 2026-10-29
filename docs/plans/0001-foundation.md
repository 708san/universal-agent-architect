# Plan 0001 — Offline-first foundation

Status: local baseline tests and GitHub CI confirmed; P0 hardening in progress. Updated: 2026-10-29.

## Outcome
Reproducible minimal core working in Node CLI and static browser, with no cloud dependencies. Codex can begin from existing instructions and issues.

## Implemented
- Pure TS core: safe path filtering, limited manifest detection, deterministic blueprint and basic Codex rendering.
- CLI inventory and isolated output directory, browser folder selector and local HTTP preview.
- Focused root instructions, 3 optional read-only custom subagents, 4 portable skills.
- Initial security and compatibility documentation; baseline node tests.
- Bounded input warnings, browser/CLI relative-path normalization coverage, and golden fixture integration tests.

## Remaining before closing P0
- Complete scanner edge-case coverage, including root scope and input-boundary behavior.
- Add automated static-hosting/CSP/no-outgoing-request checks.
- Review CI to use the committed lockfile reproducibly.
- Browser ZIP import/export remains P1 per the roadmap; this P0 plan only verifies the static browser boundary.

## Risks
- Metadata/folder names may contain secrets and can leak if later returned to cloud AI.
- Regex/manifest scanning does not establish code semantics.
- Codex-specific output is only partially verified; other targets are explicitly unsupported.

## Verification
- `npm run check` passes locally with 10 tests and the skill checker.
- GitHub Actions `CI` succeeded for the pushed `main` commit.
- `node scripts/cli.mjs analyze examples/sample-python` produces no raw secret contents.
- `node scripts/cli.mjs generate examples/sample-python codex` stages outputs without changing the source.
- Browser prototype opens with `npm run serve`; no `fetch` or third-party scripts.
