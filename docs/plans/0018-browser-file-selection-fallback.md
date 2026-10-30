# Plan 0018 — Browser file-selection fallback

Status: complete

## Objective

Allow browsers without `webkitdirectory` support to analyze explicitly selected individual files
without adding network, backend or filesystem access.

## Scope

- Add a standard `multiple` file input alongside folder selection and ZIP import.
- Reject ambiguous simultaneous input sources and explain that flat selection may lose directory
  structure.
- Reuse the existing path normalization, manifest allowlist and size limits.
- Add browser-input fixture coverage for flat file selection.

## Security/data-flow review

- Only user-selected `File` objects enter the existing browser input adapter.
- No path handles, filesystem APIs, network calls or file contents outside allowlisted manifests are
  introduced.
- Duplicate names collapse deterministically in the core; the UI does not claim to preserve missing
  directory structure.

## Verification

- `npm run check`
- `git diff --check`
- Folder, flat-file and ZIP inputs remain mutually exclusive and produce no external request.

## Rollback

Revert the browser input, UI, tests, roadmap and this plan. No user project files are modified.

## Progress

- [x] Confirm current browser input boundary and fallback behavior.
- [x] Add standard multiple-file input and fixture coverage.
- [x] Run checks and record results: `npm run check` passed (33 tests); `git diff --check` passed.
