# Plan 0017 — Browser-safe ZIP import/export

Status: complete

## Objective

Add offline browser ZIP import/export for the prototype without adding a dependency, backend or
outbound request.

## Scope

- Implement a bounded ZIP reader/writer supporting the uncompressed `store` method only.
- Reject traversal, absolute paths, sensitive paths, duplicate entries, symlink attributes, encryption,
  unsupported compression, malformed headers, CRC mismatches and resource-limit violations.
- Wire ZIP selection and generated-artifact download into the static browser page.
- Add loopback tests and browser-boundary allowlist coverage.

## Security/data-flow review

- Input is a user-selected local ZIP `File`; bytes are parsed in browser memory only.
- Only safe relative files are returned to the existing metadata-only `ProjectInput` adapter.
- ZIP contents are never uploaded, executed or logged; generated ZIPs contain only validated artifacts.
- Limits are bounded by entry count, per-entry size, total uncompressed size and archive size.

## Verification

- `npm run check`
- `git diff --check`
- ZIP round-trip and malicious archive fixtures fail closed without filesystem or network access.

## Rollback

Revert the ZIP helper, browser wiring, server allowlist, tests, docs and this plan. No user project files
are modified.

## Progress

- [x] Read product/architecture constraints and complete ZIP data-flow review.
- [x] Add bounded store-only ZIP reader/writer and tests.
- [x] Wire browser import/export and record checks: `npm run check` passed (32 tests); `git diff --check` passed.
