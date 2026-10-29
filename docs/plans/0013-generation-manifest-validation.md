# Plan 0013 — Harden generation manifest validation

Status: complete

## Objective

Make generated `UAA-MANIFEST.json` validation fail closed when provenance or output-file metadata is
malformed, unsafe, duplicated or inconsistent with the generated artifacts.

## Scope

- Validate every manifest field against the generation-manifest schema contract.
- Reject unsafe, duplicated or missing generated relative paths.
- Reject non-HTTPS or duplicated provenance URLs and invalid security profiles/status values.
- Add negative tests without reading or executing project contents.

## Security/data-flow considerations

- The manifest is descriptive metadata and grants no runtime permissions.
- Validation must not fetch URLs or disclose project source contents.
- Only generated relative paths are compared; absolute paths, traversal and sensitive paths fail.

## Verification

- `npm run check`
- `git diff --check`
- Negative manifest fixtures fail closed while generated manifests remain valid.

## Rollback

Revert this plan, validator and tests. No user project files are modified.

## Progress

- [x] Plan written before implementation.
- [x] Add strict manifest validator and negative tests.
- [x] Run checks and record results: `npm run check` passed (26 tests); `git diff --check` passed.
