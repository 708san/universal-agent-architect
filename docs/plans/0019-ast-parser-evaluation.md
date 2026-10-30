# Plan 0019 — Bounded AST parser evaluation

Status: dependency approval required before implementation

## Objective

Evaluate a browser-compatible Tree-sitter WASM analyzer for Python and TypeScript without weakening
the offline, metadata-minimizing core boundary.

## Current facts

- `src/core.ts` currently receives paths and allowlisted manifest strings, not arbitrary source content.
- The repository has no Tree-sitter dependency or vendored grammar assets.
- AST parsing would require bounded source-content transport in CLI/browser adapters and a reviewed
  dependency/grammar license set.

## Proposed slice after approval

- Keep AST parsing outside the pure planning core in an adapter/analyzer module.
- Accept only explicitly selected, safe relative source files under strict per-file, total-byte and
  file-count limits; never execute source or treat comments/strings as instructions.
- Return structural facts only: syntax validity, declarations/import counts and test-like markers;
  never retain or return source text.
- Support Python and TypeScript first; mark other languages as `unsupported` or `planned`.
- Add deterministic Node/browser-compatible fixtures, malformed-source tests, limit tests and a bundle
  size budget. Use pinned versions and `npm ci --ignore-scripts` in CI.

## Security/data-flow review

- Input: user-selected local source bytes from CLI or browser File API.
- Processing: parser in a bounded, no-network, no-subprocess boundary; grammar assets are static data.
- Output: redacted structural facts and warnings only; no raw source, secrets, absolute paths or AST
  dumps in reports.
- Failure: parser errors, unsupported grammar, oversized input and resource exhaustion fail closed or
  degrade to metadata-only analysis.

## Dependency approval gate

Before implementation, explicitly approve network access to inspect/install pinned Tree-sitter
packages and grammar assets. Record package versions, license evidence, bundle-size measurements and
whether browser loading is from local assets only. Do not run install scripts.

## Verification

- `npm run check`
- `git diff --check`
- Offline parser fixtures and negative security fixtures
- Browser asset loading and no-outgoing-request tests
- Clean `npm ci --ignore-scripts --no-audit --no-fund`

## Rollback

Revert the analyzer, dependency lockfile, grammar assets, fixtures and this plan. No user project files
are modified.

## Progress

- [x] Inspect current core boundary and confirm no local Tree-sitter dependency exists.
- [x] Define bounded data flow, unsupported behavior and verification gates.
- [ ] Obtain explicit dependency/network approval.
- [ ] Implement and measure the approved parser slice.
