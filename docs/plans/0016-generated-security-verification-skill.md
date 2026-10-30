# Plan 0016 — Generated security verification Skill

Status: complete

## Objective

Give strict-profile generated Codex projects an actionable, offline security-verification workflow
that reports evidence without pretending declarative requirements are runtime enforcement.

## Scope

- Generate `security-verification` only for the strict profile.
- Define bounded checks for traversal, symlinks, secrets, prompt injection, tool misuse, MCP redaction
  and resource limits using the project’s authorized local test workflow.
- Require explicit authorization before running project commands and prohibit network, secret reads,
  raw-source disclosure and automatic writes.
- Add deterministic output and negative tests for baseline/strict behavior.

## Security/data-flow review

- The generated Skill is instruction-only; it adds no executable scripts, tools or permissions.
- Project files and test output remain untrusted data; reports must contain findings and safe paths,
  not credentials or raw source.
- Runtime sandboxing, DLP and absence of secrets cannot be proven by this Skill and must be reported as
  unverified when not independently tested.

## Verification

- `npm run check`
- `git diff --check`
- Baseline generation omits the Skill; strict generation includes it and validates frontmatter.

## Rollback

Revert the strict-profile Skill template, tests, documentation and this plan. No user project files are
modified.

## Progress

- [x] Confirm scope and security data-flow constraints.
- [x] Add strict-profile Skill and tests.
- [x] Run checks and record results: `npm run check` passed (29 tests); `git diff --check` passed.
