# Plan 0001 — Offline-first foundation

Status: local baseline tests passed; GitHub CI pending. Updated: 2026-10-29.

## Outcome
Reproducible minimal core working in Node CLI and static browser, with no cloud dependencies. Codex can begin from existing instructions and issues.

## Implemented
- Pure TS core: safe path filtering, limited manifest detection, deterministic blueprint and basic Codex rendering.
- CLI inventory and isolated output directory, browser folder selector and local HTTP preview.
- Focused root instructions, 3 optional read-only custom subagents, 4 portable skills.
- Initial security and compatibility documentation; baseline node tests.

## Remaining before closing P0
- Execute and confirm tests on clean Node/npm installation; CI smoke run on actual GitHub.
- Browser/CLI path normalization parity.
- Browser static ZIP workflow and offline hosting checks.
- Tighten file scanner against all input edge cases; verify no outgoing requests.

## Risks
- Metadata/folder names may contain secrets and can leak if later returned to cloud AI.
- Regex/manifest scanning does not establish code semantics.
- Codex-specific output is only partially verified; other targets are explicitly unsupported.

## Verification
- `npm run check` passes.
- `node scripts/cli.mjs analyze examples/sample-python` produces no raw secret contents.
- `node scripts/cli.mjs generate examples/sample-python codex` stages outputs without changing the source.
- Browser prototype opens with `npm run serve`; no `fetch` or third-party scripts.
