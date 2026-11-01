# Plan 0036 — Skill frontmatter injection regression

Status: implemented

## Objective

Make Blueprint validation fail closed when an untrusted Skill purpose contains line breaks
or control characters that could alter generated `SKILL.md` frontmatter. Preserve the
offline, deterministic adapter contract and add a regression fixture.

## Facts

- `generateArtifacts` validates an untrusted Blueprint before target rendering.
- Skill purposes are interpolated into the frontmatter `description` field by the shared
  Skill renderer used by Codex, Claude Code, Gemini CLI, Antigravity and ChatGPT.
- The current validator checks only non-empty strings, so a purpose containing a newline
  can add arbitrary frontmatter/body lines before target validation.
- Project requirements are already flattened and bounded separately; this change does not
  turn them into permissions or execute them.

## Scope

1. Add a bounded single-line text predicate for Skill purposes in Blueprint validation.
2. Reject newline, carriage-return, NUL and other control characters, plus overlong purposes,
   before any target renderer sees the Blueprint.
3. Add positive and negative offline tests proving normal generation still works and injected
   frontmatter fails closed without emitting files.
4. Record the security finding and test evidence in this plan and the relevant security docs
   if the implementation changes the documented boundary.

## Out of scope

- Sanitizing or executing project Skill contents.
- Changing target runtime permissions or claiming runtime isolation.
- Network retrieval, cloud AI calls or automatic dependency updates.
- Changing the user requirement format or dropping user-provided context.

## Files

- `src/core.ts`
- `tests/core.test.mjs` or `tests/threat-regression.test.mjs`
- `docs/plans/0036-skill-frontmatter-injection-regression.md`

## Data-flow and security review

Input: untrusted Blueprint object → validator → shared target renderer → staged artifact.
The validator is the required boundary. On rejection, `generateArtifacts` returns no files;
the renderer must not receive the unsafe value. No data leaves the process and no filesystem
write is added.

## Verification

- `npm run check`
- `git diff --check`
- Assert valid purposes continue to render for every declared target.
- Assert injected newline/control-character purposes return `supported: false` and `files: []`.

Completed on 2026-11-01:

- Added single-line, control-character and 1,024-character bounds to Skill purposes.
- Added regression coverage for newline, carriage-return, NUL and oversized injection payloads.
- `npm run check`: passed, 71 tests; Skill frontmatter, capability registry and target snapshots passed.
- `git diff --check`: passed.

## Rollback

Revert the validator, tests and plan. This only restores the prior permissive input behavior;
it does not alter project files or Git history.
