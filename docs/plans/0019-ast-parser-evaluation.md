# Plan 0019 — Bounded AST parser evaluation

Status: CLI-first slice implemented; browser asset packaging remains planned

## Objective

Evaluate a browser-compatible Tree-sitter WASM analyzer for Python and TypeScript without weakening
the offline, metadata-minimizing core boundary.

## Current facts

- `src/core.ts` currently receives paths and allowlisted manifest strings, not arbitrary source content.
- The approved implementation uses pinned `web-tree-sitter` and Python/TypeScript grammar
  packages as local WASM assets. The pure planning core remains dependency-free.
- AST parsing would require bounded source-content transport in CLI/browser adapters and a reviewed
  dependency/grammar license set.

## Implemented slice

- Keep AST parsing outside the pure planning core in an adapter/analyzer module.
- Accept only explicitly selected, safe relative source files under strict per-file, total-byte and
  file-count limits; never execute source or treat comments/strings as instructions.
- Return structural facts only: syntax validity, declarations/import counts and test-like markers;
  never retain or return source text.
- Support Python and TypeScript first; mark other languages as `unsupported` or `planned`.
- Add deterministic Node fixtures, malformed-source tests and limit tests. Use pinned versions and
  `npm ci --ignore-scripts` in CI.

The first implementation is intentionally CLI-only:

- `node scripts/cli.mjs analyze <directory> codex baseline --ast` reads only bounded local Python and
  TypeScript sources and emits structural facts.
- Dependencies are pinned to `web-tree-sitter@0.27.1`, `tree-sitter-python@0.25.0` and
  `tree-sitter-typescript@0.23.2`; package metadata declares MIT licenses.
- The local WASM assets total approximately 2.1 MB: runtime 210,415 bytes, Python 457,883 bytes and
  TypeScript 1,413,849 bytes.
- Install scripts were not run. The CLI does not download parser assets at runtime.

Browser loading of these assets remains a separate task because it needs an explicit static-asset
packaging decision and browser no-network tests.

## Security/data-flow review

- Input: user-selected local source bytes from CLI or browser File API.
- Processing: parser in a bounded, no-network, no-subprocess boundary; grammar assets are static data.
- Output: redacted structural facts and warnings only; no raw source, secrets, absolute paths or AST
  dumps in reports.
- Failure: parser errors, unsupported grammar, oversized input and resource exhaustion fail closed or
  degrade to metadata-only analysis.

## Dependency approval gate

The dependency/network approval was granted for this CLI-first slice. Package versions, license
evidence, bundle-size measurements and the browser deferral are recorded above. Install scripts were
not run.

## Verification

- `npm run check`
- `git diff --check`
- Offline parser fixtures and negative security fixtures
- Browser asset loading and no-outgoing-request tests (pending browser packaging)
- Clean `npm ci --ignore-scripts --no-audit --no-fund`

## Rollback

Revert the analyzer, dependency lockfile, grammar assets, fixtures and this plan. No user project files
are modified.

## Progress

- [x] Inspect current core boundary and confirm no local Tree-sitter dependency exists.
- [x] Define bounded data flow, unsupported behavior and verification gates.
- [x] Obtain explicit dependency/network approval.
- [x] Implement and measure the approved CLI parser slice.
- [ ] Package local parser assets for the browser and add browser no-network tests.
