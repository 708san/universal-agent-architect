# Plan 0025 — Claude Code adapter foundation

Status: complete

## Objective

Add a pure, staged Claude Code renderer for project instructions, Agent Skills and read-only review
subagents without changing the canonical Blueprint schema or starting Claude Code.

## Specification facts checked

- Claude Code reads project `CLAUDE.md` files as persistent instructions and also documents
  `AGENTS.md` compatibility.
- Project Skills use `.claude/skills/<skill-name>/SKILL.md` and follow the Agent Skills format.
- Project subagents use `.claude/agents/<name>.md` with YAML frontmatter followed by Markdown; the
  `tools` field can restrict available tools.
- Sources checked 2026-10-30: Claude Code memory, Skills and subagents documentation.

## Scope

- Add a pure Claude Code renderer selected by `Blueprint.target === 'claude-code'`.
- Render `CLAUDE.md`, `.claude/skills/**/SKILL.md`, optional `.claude/agents/reviewer.md` and the
  existing provenance manifest.
- Validate Claude skill and subagent frontmatter, safe paths, duplicate paths and manifest metadata.
- Add positive, malformed and unsupported/negative fixtures.
- Keep MCP configuration, hooks, plugins, permission enforcement and runtime loading explicitly
  unverified; do not generate them.

## Security/data-flow review

- Input: validated deterministic Blueprint only; no filesystem, network, provider or subprocess call.
- Output: relative staged files only; no tokens, absolute local paths, source contents or MCP values.
- The reviewer subagent is limited to documented read-only tools in its generated frontmatter, but
  this is a target configuration claim, not proof of host runtime enforcement.
- Existing files remain protected by the existing staging, diff, explicit apply and rollback flow.

## Verification

- Blueprint and renderer tests for Claude paths and content.
- Negative tests for malformed Claude frontmatter, unsafe output paths and unsupported target behavior.
- `npm run check` and `git diff --check` offline.
- No Claude Code runtime or cloud service is launched by tests.

## Rollback

Revert the adapter, fixtures, registry and documentation changes. No user project files are changed.

## Security review result

- No new filesystem, network, subprocess or provider boundary was added; the renderer consumes only
  a validated Blueprint and returns relative staged artifacts.
- Generated Claude subagents request only `Read`, `Glob` and `Grep`, while tests reject missing or
  altered tool restrictions. This is configuration evidence, not host-level permission proof.
- No MCP, hook, plugin, token, environment value or absolute local path is generated.

## Result

- Claude Code format-level output is supported for `CLAUDE.md`, project Skills and an optional review
  subagent; the capability registry records the target as `partial`.
- `npm run check` passed: 52 tests, skill format check and capability registry check; `git diff --check`
  passed.

