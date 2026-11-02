# Backlog and issue candidates — prioritized

Status reviewed: 2026-11-02. Create GitHub issues only for the open work below; completed
items are recorded as evidence and should not be recreated as duplicate issues.

GitHub tracking: [#43 Codex runtime verification](https://github.com/708san/universal-agent-architect/issues/43),
[#44 native MCP authorization evidence](https://github.com/708san/universal-agent-architect/issues/44),
[#45 target runtime verification matrix](https://github.com/708san/universal-agent-architect/issues/45),
[#47 explicit online specification refresh](https://github.com/708san/universal-agent-architect/issues/47),
and [#46 consented cloud and local AI connectors](https://github.com/708san/universal-agent-architect/issues/46).

## Completed local foundation

- Offline browser boundary: CSP, no-network policy, local asset allowlist and static Pages checks.
- Bounded inventory scanner: sensitive paths, traversal, symlink, hidden-directory and resource-limit fixtures.
- CLI/browser golden convergence for facts, Blueprint and artifact validation.
- Store-only ZIP import/export with traversal, symlink, compression, CRC and resource-limit rejection.
- Staged generation, dry-run conflict reporting, explicit apply and scoped rollback.
- Blueprint/capability schemas, target format fixtures, planner evaluation and offline security regression tests.

## Open engineering work

### P1 — Runtime and compatibility evidence

1. **Codex runtime verification** — In a clean target project, verify `AGENTS.md`, Skills,
   custom-agent loading and documented permission behavior. Acceptance: reproducible evidence
   tied to a target/runtime version; unsupported behavior remains explicit.
2. **Target runtime verification matrix** — Repeat the same evidence process for Claude Code,
   Gemini CLI, Antigravity and ChatGPT where a supported local or hosted test environment exists.
   Acceptance: no target is upgraded from `partial` without positive, negative and security evidence.
3. **MCP authorization evidence** — Verify native target MCP discovery and approval behavior
   separately from UAA's local read-only MCP boundary. Acceptance: no raw project content or
   credentials are returned by default.

### P3 — Opt-in online capabilities

4. **Online specification refresh** — Add explicit, allowlisted retrieval that produces the
   existing local candidate/diff format without auto-activation. Retrieved text remains untrusted;
   source, version, date and reviewed fixtures are recorded.
5. **Cloud/local AI connectors** — Add only behind outbound consent, data minimization, preview,
   bounded cost and rollback controls.

## External maintainer actions

- Create GitHub issues for the open items above after confirming their acceptance criteria.
- Verify `main` branch protection, required CI, private vulnerability reporting and a maintainer
  security contact in GitHub settings.
- Keep runtime evidence and incident records private when they contain source excerpts or findings.

## Prioritization rule

Finish offline evidence and security checks before adding network or model connectors. Do not
change a capability from `partial`, `unknown` or `planned` to `verified` based on documentation
alone.
