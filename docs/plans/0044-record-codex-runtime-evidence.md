# Plan 0044: Record partial Codex VS Code runtime evidence

## Objective

Record the user-provided Codex VS Code observation as metadata-only, unreviewed partial evidence.
This documents observed instruction injection and reviewer invocation without changing the
Capability Registry or claiming permissions, Skill loading, MCP behavior or reviewer isolation.

## Evidence boundary

- Observed: `AGENTS.md` was injected/applied by Codex; reviewer subagent invocation completed.
- Not observed: Skill runtime loading, reviewer file access, permission enforcement and MCP behavior.
- No raw source, transcript, absolute personal path, credential or command output is stored.

## Scope and files

- `tests/fixtures/runtime-evidence-codex-0.1.json`: update the partial metadata fixture.
- `tests/runtime-evidence.test.mjs`: assert the newly recorded statuses and limitations.
- `docs/COMPATIBILITY.md` and `docs/RUNTIME_VERIFICATION.md`: distinguish partial runtime evidence
  from format evidence and preserve the promotion gate.
- `docs/plans/0044-record-codex-runtime-evidence.md`: record the decision and verification.

## Security and rollback

The record remains `partial` and `unreviewed`; no registry or target snapshot is activated.
Reverting the documentation/fixture commit removes the observation without changing generated output.

## Progress

- [x] Confirm PR #50 is merged and classify the supplied observation.
- [x] Define statuses conservatively and exclude raw data.
- [x] Update fixture, tests and documentation.
- [x] Run checks and review the complete diff.
- [ ] Commit and open a PR.
