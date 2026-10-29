# Platform capability registry — policy and status

The machine-readable snapshot is [`data/capability-registry-0.1.json`](../data/capability-registry-0.1.json)
and its structural contract is [`schemas/capability-registry-0.1.schema.json`](../schemas/capability-registry-0.1.schema.json).
It is a reviewed snapshot, not an automatic claim of latest support. `verified` and `partial` entries
must include an official source URL and a local fixture; `planned` and `unknown` entries must not be
rendered as supported.

Checked: 2026-10-29. **Supported in core** != **planned target**. Product and subscription differences must be recorded.

| Target | Local project instruction | Skill | Custom subagent | MCP | Renderer in prototype |
|---|---|---|---|---|---|
| Codex (CLI/IDE) | `AGENTS.md` | `.agents/skills/` | `.codex/agents/*.toml` | `config.toml` or CLI | **Partial** (basic rules/skills, optional reviewer) |
| Claude Code | `CLAUDE.md` | supported (target-specific) | supported | supported | **No** |
| Gemini CLI | `GEMINI.md` | supported (target-specific) | supported | supported | **No** |
| Antigravity | verify current native paths before implementation | verify | verify | verify | **No** |
| ChatGPT browser/plugin | depends on product/plan | supported in eligible contexts | do not assume Codex agents | remote MCP/plugin | **No** |

The table is planning guidance, **not a promise of equivalence**. A feature is "verified" only after fixture tests against official documented formats. Remote MCP requires connectivity and might expose returned information to cloud AI.

## Primary official sources
- Codex instructions: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- Codex subagents: https://learn.chatgpt.com/docs/agent-configuration/subagents
- Codex skills: https://learn.chatgpt.com/docs/build-skills
- Agent Skills spec: https://agentskills.io/specification
- MCP TypeScript SDK (v1): https://ts.sdk.modelcontextprotocol.io/server
- OpenAI Docs MCP (opt-in): https://developers.openai.com/learn/docs-mcp
- ChatGPT plugins/MCP: https://developers.openai.com/plugins/quickstart

## Version policy
Record target, UI/CLI edition, version, official URL, date checked, supported/unknown/unsupported/experimental status and test fixture in each capability snapshot. Do not auto-replace reviewed snapshots with untrusted web content.
