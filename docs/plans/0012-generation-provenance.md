# Plan 0012 — Generation provenance manifest

Status: complete

## Objective

Make every supported generation explain which target snapshot, verification state and security profile
produced the artifacts.

## Scope

- Add Blueprint target edition/version and capability-registry provenance fields.
- Generate a deterministic `UAA-MANIFEST.json` alongside Codex artifacts.
- Add a manifest schema and validation tests.
- Ensure the manifest contains no project source, secrets or user filesystem paths.

## Security/data-flow considerations

- Provenance is local descriptive metadata; it does not grant runtime permissions.
- Source URLs are reviewed registry metadata, not fetched or executed during generation.
- The manifest lists generated relative filenames only and must not echo project input contents.

## Verification

- `npm run check`
- `git diff --check`
- Generated manifest is deterministic and validates its provenance/security fields.

## Rollback

Revert the Blueprint fields, manifest schema, renderer output, tests and this plan. No user project files
are modified.

## Progress

- [x] Plan written before implementation.
- [x] Add provenance fields, manifest schema and renderer output.
- [x] Add tests and record checks: `npm run check` passed (25 tests); `git diff --check` passed.
