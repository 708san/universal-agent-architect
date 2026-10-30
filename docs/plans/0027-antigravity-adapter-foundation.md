# Plan 0027 — Antigravity adapter foundation

Status: complete

## Objective

Add a pure, staged Antigravity renderer for workspace rules, Agent Skills and a read-only custom
subagent without changing the canonical Blueprint schema or launching Antigravity.

## Specification facts checked

- Antigravity discovers workspace `AGENTS.md`/`GEMINI.md` rules and `.agents/rules/*.md` rules.
- Workspace Agent Skills use `.agents/skills/<skill-name>/SKILL.md`.
- Workspace custom subagents use `.agents/agents/<name>.md` with YAML frontmatter; `tools`,
  `subagent`, `mainAgent`, `model` and `commandExecutionPolicy` are documented fields.
- Sources checked 2026-10-30: Antigravity rules, Agent Skills and custom subagents documentation.

## Scope

- Add a pure Antigravity renderer selected by `Blueprint.target === 'antigravity'`.
- Render `AGENTS.md`, `.agents/skills/**/SKILL.md`, optional `.agents/agents/reviewer.md` and the
  existing provenance manifest.
- Validate Antigravity subagent frontmatter, safe paths, duplicate paths and manifest metadata.
- Add positive, malformed and unsupported/negative fixtures.
- Keep MCP, hooks, plugins, workflows and runtime permission enforcement explicitly unverified; do
  not generate them.

## Security/data-flow review

- Input: validated deterministic Blueprint only; no filesystem, network, provider or subprocess call.
- Output: relative staged files only; no tokens, absolute local paths, source contents or MCP values.
- The reviewer subagent requests only `view_file` and `grep_search`, sets `subagent: true`,
  `mainAgent: false` and `commandExecutionPolicy: off`; this is configuration evidence, not proof of
  host runtime enforcement.
- Existing files remain protected by staging, diff, explicit apply and rollback.

## Verification

- Blueprint and renderer tests for Antigravity paths and content.
- Negative tests for malformed frontmatter, unsafe output paths and unsupported target behavior.
- `npm run check` and `git diff --check` offline.
- No Antigravity runtime or cloud service is launched by tests.

## Rollback

Revert the adapter, fixtures, registry and documentation changes. No user project files are changed.

## Security review result

- No new filesystem, network, subprocess or provider boundary was added; the renderer consumes only
  a validated Blueprint and returns relative staged artifacts.
- The generated Antigravity subagent requests only `view_file` and `grep_search`, sets
  `commandExecutionPolicy: off`, and cannot be selected as the main agent. This is configuration
  evidence, not host-level permission proof.
- No MCP, hook, plugin, workflow, token, environment value or absolute local path is generated.

## Result

- Antigravity format-level output is supported for workspace rules, project Skills and an optional
  review subagent; the capability registry records the target as `partial`.
- `npm run check` passed: 56 tests, skill format check and capability registry check; `git diff --check`
  passed.

