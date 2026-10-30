# Plan 0026 — Gemini CLI adapter foundation

Status: complete

## Objective

Add a pure, staged Gemini CLI renderer for project context, Agent Skills and a read-only review
subagent without changing the canonical Blueprint schema or launching Gemini CLI.

## Specification facts checked

- Gemini CLI uses project `GEMINI.md` files for persistent instructional context.
- Workspace Agent Skills use `.gemini/skills/<skill-name>/SKILL.md`; `.agents/skills` is a documented
  compatibility alias.
- Project custom subagents use `.gemini/agents/*.md` with YAML frontmatter, including `name`,
  `description`, optional `kind`, and an explicit `tools` list.
- Sources checked 2026-10-30: Gemini CLI GEMINI.md, Agent Skills, subagent and configuration docs.

## Scope

- Add a pure Gemini CLI renderer selected by `Blueprint.target === 'gemini-cli'`.
- Render `GEMINI.md`, `.gemini/skills/**/SKILL.md`, optional `.gemini/agents/reviewer.md` and the
  existing provenance manifest.
- Validate Gemini skill and subagent frontmatter, safe paths, duplicate paths and manifest metadata.
- Add positive, malformed and unsupported/negative fixtures.
- Keep MCP configuration, hooks, extensions, scripts and runtime permission enforcement explicitly
  unverified; do not generate them.

## Security/data-flow review

- Input: validated deterministic Blueprint only; no filesystem, network, provider or subprocess call.
- Output: relative staged files only; no tokens, absolute local paths, source contents or MCP values.
- The reviewer subagent requests only documented read-only tools (`read_file`, `grep_search`), but
  this is configuration evidence, not proof of host runtime enforcement.
- Existing files remain protected by staging, diff, explicit apply and rollback.

## Verification

- Blueprint and renderer tests for Gemini paths and content.
- Negative tests for malformed Gemini frontmatter, unsafe output paths and unsupported target behavior.
- `npm run check` and `git diff --check` offline.
- No Gemini CLI runtime or cloud service is launched by tests.

## Rollback

Revert the adapter, fixtures, registry and documentation changes. No user project files are changed.

## Security review result

- No new filesystem, network, subprocess or provider boundary was added; the renderer consumes only
  a validated Blueprint and returns relative staged artifacts.
- The generated Gemini subagent requests only documented read-only tools (`read_file`, `grep_search`),
  while tests reject missing or altered tool restrictions. This is configuration evidence, not host-level
  permission proof.
- No MCP, hook, extension, token, environment value or absolute local path is generated.

## Result

- Gemini CLI format-level output is supported for `GEMINI.md`, project Skills and an optional review
  subagent; the capability registry records the target as `partial`.
- `npm run check` passed: 54 tests, skill format check and capability registry check; `git diff --check`
  passed.

