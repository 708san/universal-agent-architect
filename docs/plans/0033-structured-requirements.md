# Plan 0033 — Structured project requirements

Status: implemented. Updated: 2026-11-01.

## Objective

Allow users and authorized AI hosts to provide bounded project requirements so the deterministic
planner can tailor generated instructions and Skills without making network, write or execution
permissions implicit.

## Scope

- Add a versioned-in-place `ProjectRequirements` shape to the Blueprint.
- Accept the shape from the browser UI, CLI stdin and the local MCP proposal tool.
- Render requirements as clearly labeled user context in target instructions.
- Add deterministic and negative tests for output, size limits and network fail-closed behavior.
- Keep the shared core pure and keep source files out of requirement reports.

## Requirement fields

- `goal`: one bounded user-provided goal string.
- `constraints`: up to ten bounded user-provided context strings.
- `requiredChecks`: allowlisted checks (`test`, `security`, `dependency`, `build`, `lint`, `typecheck`).
- `allowNetwork`: currently fixed to `false`; true is rejected in the offline core.

## Security and data-flow assessment

- Requirements are untrusted context, not permissions or executable instructions.
- Text is flattened and bounded before rendering; secrets are not automatically detected, so the
  UI warns users not to enter them.
- MCP remains fixed-project and read-only; CLI stdin is bounded and no external process is started
  from the requirements.
- Existing target capability and security validation remain authoritative.

## Verification

- Core deterministic and fail-closed tests.
- CLI stdin acceptance test.
- MCP proposal acceptance and redaction-boundary test.
- Full `npm run check` passed: 65 tests; Skill, capability registry and target snapshot checks also
  passed.
- `npm run pages` passed.
- Sample-project CLI analysis confirmed that goal, constraints and required checks reach the
  Blueprint and select the expected Skills.
- `git diff --check` passed.

## Rollback

Revert the requirements module, Blueprint/schema changes, adapters, input wiring, tests and this
plan. Existing callers without requirements retain empty requirements defaults.
