# Platform capability registry — policy and status

The machine-readable snapshot is [`data/capability-registry-0.1.json`](../data/capability-registry-0.1.json)
and its structural contract is [`schemas/capability-registry-0.1.schema.json`](../schemas/capability-registry-0.1.schema.json).
It is a reviewed snapshot, not an automatic claim of latest support. `verified` and `partial` entries
must include an official source URL and a local fixture; `planned` and `unknown` entries must not be
rendered as supported.

Checked: 2026-11-01. **Supported in core** != **planned target**. Product and subscription differences must be recorded.

The 2026-11-01 refresh checked the current official Codex `AGENTS.md`, custom-agent and Skills
documentation, the Agent Skills specification, Claude Code memory/Skills/subagent documentation,
Gemini CLI Skills/subagent documentation, Google Antigravity rules/Skills/subagent documentation,
and OpenAI portable plugin documentation. This confirms documented file formats and discovery
guidance only; it does not prove that UAA-generated files load or enforce permissions in each runtime.

Current local evidence remains format-level and offline: generated artifacts pass target validators,
fixtures and security regression tests, but no target runtime is upgraded to `verified` without an
independent runtime-specific evidence record. The offline test suite does not require Codex CLI or
any other target CLI.

## Current Codex evidence

The prototype now validates the documented file shapes for `AGENTS.md`, Agent Skills and project-scoped
custom agents under `.codex/agents/*.toml`. The fixture is [`codex-adapter-0.1.json`](../tests/fixtures/codex-adapter-0.1.json).
This is format-level evidence only: the repository does not launch Codex to prove runtime discovery,
permission inheritance or actual Skill execution. The target therefore remains **partial**.

| Target | Local project instruction | Skill | Custom subagent | MCP | Renderer in prototype |
|---|---|---|---|---|---|
| Codex (CLI/IDE) | `AGENTS.md` | `.agents/skills/` | `.codex/agents/*.toml` | `config.toml` or CLI | **Partial** (basic rules/skills, optional reviewer) |
| Claude Code | `CLAUDE.md` | `.claude/skills/<name>/SKILL.md` | `.claude/agents/<name>.md` | supported but not rendered | **Partial** (format-level renderer; runtime unverified) |
| Gemini CLI | `GEMINI.md` | `.gemini/skills/<name>/SKILL.md` | `.gemini/agents/<name>.md` | documented but not rendered | **Partial** (format-level renderer; runtime unverified) |
| Antigravity | `AGENTS.md` / `GEMINI.md` / `.agents/rules/` | `.agents/skills/<name>/SKILL.md` | `.agents/agents/<name>.md` | documented but not rendered | **Partial** (format-level renderer; runtime unverified) |
| ChatGPT browser/plugin | no local project file claimed | portable `plugin.json` + root `skills/` | unsupported/not assumed | supported by documented plugin/MCP formats but not rendered | **Partial** (manifest/Skills only; runtime unverified) |

The table is planning guidance, **not a promise of equivalence**. A feature is "verified" only after fixture tests against official documented formats. Remote MCP requires connectivity and might expose returned information to cloud AI.

## UAA local MCP evidence

The repository includes a separate local read-only MCP stdio adapter using
`@modelcontextprotocol/server@2.4.0` (Apache-2.0), aligned with the MCP `2026-07-28` specification
and official `serveStdio` guidance. Its fixture verifies protocol startup, tool listing, schema
rejection, stdout purity and redacted project summaries. This verifies the UAA server boundary only;
it does not verify Codex's native MCP discovery or permission behavior.

## Primary official sources
- Codex instructions: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- Codex subagents: https://learn.chatgpt.com/docs/agent-configuration/subagents
- Agent Skills spec: https://agentskills.io/specification
- Codex skills overview: https://learn.chatgpt.com/docs/build-skills
- MCP TypeScript SDK (v1): https://ts.sdk.modelcontextprotocol.io/server
- MCP TypeScript SDK (v2): https://ts.sdk.modelcontextprotocol.io/v2/
- MCP stdio serving: https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio
- MCP `2026-07-28` release: https://blog.modelcontextprotocol.io/posts/2026-07-28/
- OpenAI plugin MCP manifest: https://developers.openai.com/plugins/deploy/submission-errors
- OpenAI portable plugin package: https://developers.openai.com/plugins/build/plugins
- Gemini CLI MCP configuration: https://geminicli.com/docs/tools/mcp-server/
- OpenAI Docs MCP (opt-in): https://developers.openai.com/learn/docs-mcp
- ChatGPT plugins/MCP: https://developers.openai.com/plugins/quickstart
- Claude Code memory: https://code.claude.com/docs/en/memory
- Claude Code Skills: https://code.claude.com/docs/en/skills
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Gemini CLI GEMINI.md: https://geminicli.com/docs/cli/gemini-md/
- Gemini CLI Agent Skills: https://geminicli.com/docs/cli/creating-skills/
- Gemini CLI subagents: https://geminicli.com/docs/core/subagents/
- Antigravity rules: https://antigravity.google/docs/rules/
- Antigravity Agent Skills: https://antigravity.google/docs/skills
- Antigravity custom subagents: https://antigravity.google/docs/subagents?tab=cli

## Update workflow

Create a local candidate from reviewed official evidence and compare it before activation:

```bash
node scripts/spec-refresh.mjs validate --candidate=path/to/candidate.json
node scripts/spec-refresh.mjs diff --candidate=path/to/candidate.json
node scripts/spec-refresh.mjs apply --candidate=path/to/candidate.json --confirm
```

The candidate must use the versioned envelope in
[`capability-update-candidate-0.1.schema.json`](../schemas/capability-update-candidate-0.1.schema.json).
The first two commands do not modify the active registry. Activation also updates the local target
snapshot dates/status metadata. Human review, fixture changes and runtime tests remain required before
changing an entry to `verified`.

## Version policy
Record target, UI/CLI edition, version, official URL, date checked, supported/unknown/unsupported/experimental status and test fixture in each capability snapshot. Do not auto-replace reviewed snapshots with untrusted web content.
