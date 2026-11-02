# Plan 0041: Runtime Evidence promotion workflow

## Objective

Add a local-only, explicit promotion workflow that can update one target's capability
registry entry only when runtime evidence is complete, human-reviewed and validated.
Partial or unreviewed evidence must remain non-activating metadata.

## Scope and files

- `src/runtime-evidence.ts`: expose a pure promotion function that validates eligibility
  and produces a registry candidate without executing evidence references.
- `scripts/promote-runtime-evidence.mjs`: provide `validate`, read-only `diff` and
  `apply --confirm` commands with atomic writes limited to the registry and target snapshot.
- `tests/runtime-evidence.test.mjs`: cover eligibility, registry mapping, non-disclosure,
  and confirmation/write gates.
- `package.json`: expose the promotion command.
- `docs/RUNTIME_VERIFICATION.md`: document the review and activation workflow.

## Security and data-flow risks

- Evidence JSON and referenced IDs are untrusted metadata; the workflow must never execute
  commands, read referenced files, contact a network, or copy raw limitations into registry
  diffs.
- Registry writes are a public compatibility claim, so activation requires `--confirm`,
  validated complete evidence, and a human-review status.
- Writes are restricted to `data/capability-registry-0.1.json` and the selected target
  snapshot, using temporary files and rollback on failure.
- The existing partial Codex fixture must continue to validate but must not be promotable.

## Verification

- Run the new focused runtime-evidence tests, then `npm run check` and `git diff --check`.
- Exercise `validate`/`diff` with the existing partial fixture and confirm no files change.
- Test a synthetic complete reviewed evidence object through the pure promotion function;
  no real registry activation is performed during tests.

## Rollback

The feature is isolated to one branch. Before activation, `diff` is read-only. During activation,
the script retains in-memory originals and restores them if any target snapshot write fails.
Reverting the single feature commit restores the previous registry workflow.

## Progress

- [x] Confirm latest merged main and inspect relevant contracts.
- [x] Implement pure promotion and guarded script.
- [x] Add regression tests and documentation.
- [x] Run checks and review the complete diff.
- [x] Commit and open a PR.
