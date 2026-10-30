# GitHub issue candidates — prioritized

Create these as separate GitHub issues after the repository is published. Each issue should be a small reviewable PR.

## P0
1. **Verify offline-browser boundary** — Test network blocking, path normalization, static asset bundling, CSP in deployed hosting. Acceptance: no project data leaves browser in blocked-network test.
2. **Harden inventory scanner** — Resolve symlinks, hidden directories, limits and user-approved scan scope across platforms. Acceptance: negative traversal, symlink and oversized input fixtures.
3. **Add golden fixtures** — Given identical safe inputs, CLI and browser produce identical facts, blueprint and validation outcomes. Acceptance: deterministic snapshots.

## P1
4. **Canonical blueprint schema** — Versioned JSON Schema, migrations, explanations and provenance. Acceptance: invalid feature/platform combination rejected.
5. **Official Codex adapter v1** — Detailed config/skills/subagent/MCP templates, current official docs, validated fixtures. Acceptance: Codex loads generated instructions/skills; unsupported gets explicit notice.
6. **Existing-config inventory and dry-run diff** — Compare with existing AGENTS.md and skills; never overwrite. Acceptance: conflicts explained without local mutation.
7. **AST parser spike** — Evaluate Tree-sitter WASM for Python/TS under browser constraints; report size/performance. Acceptance: no execution of target project.
8. **Planner evaluation suite** — Small/medium/large projects, single vs multiagent choice, duplicate-skill avoidance. Acceptance: documented expected decisions and regressions.

## P2
9. **stdio MCP server** — Read-only list_capabilities/analyze_project/propose_blueprint with redacted responses. Acceptance: local MCP inspector test and data-flow threat checks.
10. **Per-service adapters** — Claude Code, Gemini CLI, Antigravity, ChatGPT as independent verified issues. Acceptance: no unsupported feature claims. **Implemented at format level; runtime behavior remains separately unverified.**
