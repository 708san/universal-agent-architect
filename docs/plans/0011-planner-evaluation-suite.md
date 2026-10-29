# Plan 0011 — Planner evaluation suite

Status: in progress

## Objective

Create deterministic evaluation fixtures for the rule planner so changes cannot silently inflate agent
count, duplicate Skills or lose explainability.

## Scope

- Add small, medium and large project-shaped safe inputs.
- Cover single-agent defaults, review requests, test detection and multi-workstream delegation.
- Assert unique Skill/agent IDs and required decision reasons.
- Keep evaluation fully offline and free of source contents or network calls.

## Security/data-flow considerations

- Fixtures contain paths and minimal allowlisted metadata only.
- No fixture executes project commands or includes credentials.
- The suite validates planning output, not runtime permission enforcement.

## Verification

- `npm run check`
- `git diff --check`

## Rollback

Revert the evaluation fixtures, test and this plan. No user project files are modified.

## Progress

- [x] Plan written before implementation.
- [x] Add planner cases and assertions.
- [x] Record checks and update roadmap: `npm run check` passed (25 tests); `git diff --check` passed.
