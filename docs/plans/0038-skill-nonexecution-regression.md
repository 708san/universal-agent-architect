# Plan 0038 — Imported Skill non-execution regression

Status: implemented

## Objective

Prove that hostile Skill text is treated as untrusted data during local CLI inventory and
existing-config review. The test must demonstrate that a script-looking Skill cannot create
files or otherwise execute as a side effect.

## Facts

- UAA reads recognized Skill files only for bounded structural status during config review.
- The security specification forbids executing imported Skills and project scripts by default.
- Existing tests check that Skill contents are not returned, but do not use an execution-marker
  payload to prove non-execution.

## Scope

1. Add a temporary-project regression fixture containing a shell/Node script-looking Skill body.
2. Run the existing local config review path against it.
3. Assert the marker file is absent and the report does not expose the Skill body.
4. Record offline test evidence and the data-flow boundary.

## Out of scope

- Executing any imported or generated script.
- Changing the scanner to interpret Skill text.
- Adding network, provider, MCP or runtime-agent behavior.

## Files

- `tests/cli-integration.test.mjs`
- `docs/plans/0038-skill-nonexecution-regression.md`

## Data-flow and security review

Temporary project Skill text → bounded local config inventory → path/kind/status summary.
The content must not become a command, subprocess, network request or model instruction.
The marker path is temporary and is checked only for non-existence.

## Verification

- `npm run check`
- `git diff --check`
- The new test passes without network or Codex CLI.

Completed on 2026-11-01:

- Added a hostile Skill body containing a marker-writing Node command as inert text.
- Confirmed CLI config review returns only structural metadata and does not create the marker.
- `npm run check`: passed, 73 tests; Skill frontmatter, capability registry and target snapshots passed.
- `git diff --check`: passed.

## Rollback

Revert the test and plan. No production behavior or user project files are changed.
