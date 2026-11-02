# Plan 0043: Explicit CLI reviewer generation

## Objective

Expose the already-supported read-only Codex reviewer subagent through an explicit CLI option.
Keep the default minimal one-agent output unchanged, while allowing runtime verification of the
`.codex/agents/reviewer.toml` format when the user requests it.

## Scope

- `scripts/cli.mjs`: add `--reviewer` to generation/analyze option parsing and pass two
  independent workstreams only when explicitly requested.
- `tests/cli-integration.test.mjs`: verify default output remains minimal and `--reviewer`
  stages a validated reviewer file with read-only flags.
- `docs/RUNTIME_VERIFICATION.md`: document the reviewer-enabled generation command.
- `docs/plans/0043-cli-reviewer-option.md`: record scope, security and verification.

## Security and data flow

- The option changes only deterministic artifact selection; it does not execute a subagent,
  grant permissions, start MCP or make network requests.
- The generated reviewer remains read-only by validator-enforced flags and instruction text.
- Existing default behavior remains one main agent, preventing silent agent inflation.

## Verification and rollback

- Run focused CLI integration tests, `npm run check` and `git diff --check`.
- Rollback is a single commit revert; generated staging remains separate from the source project.

## Progress

- [x] Confirm latest merged main and identify missing explicit reviewer control from runtime test.
- [x] Define a minimal opt-in CLI flag.
- [x] Implement, test and document the flag.
- [x] Run checks and review the complete diff.
- [ ] Commit and open a PR.
