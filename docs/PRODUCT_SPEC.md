# Product specification — v0.1 (2026-10-29)

## Problem and users
AI services accept different rules, skills, subagents and MCP integration formats. People repeatedly create stale or excessive agent configurations and may expose private project content when asking hosted models to do that work.

## Product promise
Analyze explicitly selected local project metadata, choose the smallest effective agent architecture, generate target-native configuration when verified, explain trade-offs, and prevent unsolicited disclosure or modification. No cloud account needed for core use.

## Interaction modes (target state)
1. Static browser app (GitHub Pages, local File API; ZIP upload and export; no backend).
2. CLI / future local desktop app (bounded filesystem scope, staged writes).
3. Local MCP server (stdio initially; HTTP optional later; every returned result is treated as a potential disclosure to a model).
4. Optional local AI and optional authorized cloud AI for advanced synthesis. Neither is required for baseline generation.

## Output categories
- Rules / project instructions; Agent Skills (`SKILL.md`); subagent definitions where target supports them; MCP connection proposals (never credentials); architecture report; security/validation report; manifest/version provenance.

## Supported target families (product goal)
- Codex; Claude Code; Gemini CLI; Antigravity; ChatGPT. Distinguish ChatGPT browser/plugin capabilities from Codex and Gemini browser from Gemini CLI. Use documented capabilities, not guessed feature equivalence.

## Target use cases
- Phase 1: coding projects and existing configurations.
- Expansion: presentations, notebooks, research, analytics and arbitrary task packs.

## Functional requirements
- FR-01 Analyze bounded directory structure and allowlisted manifests; no execution.
- FR-02 Detect existing instructions/skills/settings and identify overlaps with evidence.
- FR-03 Rule-based blueprint generation; explain every decision, show alternatives, prefer minimal agents.
- FR-04 Target adapter rendering with explicit unsupported/unknown state.
- FR-05 Validate paths, format, supported features and security before generating.
- FR-06 Stage outputs and diff before explicit application; rollback after application.
- FR-07 Versioned capability registry with official-source provenance and offline snapshots.
- FR-08 Local MCP interface and authorized cloud access without concealing data egress.
- FR-09 Optional AI enrichment behind consent/egress controls.
- FR-10 Plugin extension points for future task packs and AI targets.

## Nonfunctional requirements
- Private files and raw source never leave device by default; no telemetry.
- Browser core has no Node.js dependencies and works offline once assets are installed.
- Deterministic results for same inputs + registry version; reproducible output manifests.
- Explicit error on unsupported targets and oversized/malformed inputs.
- Portable on macOS / Windows / Linux (full local permissions may differ).
- Accessible Japanese-first UI, English internal identifiers. UI work follows
  [`UI_DESIGN_GUIDELINES.md`](UI_DESIGN_GUIDELINES.md): readability first, portable local font
  fallback, small semantic color palette, explicit operation states and no remote UI assets in the
  offline core.

## Not in initial milestone
Fully automated project meaning analysis; one-click public plugin publication; universal agent runtime; autonomous execution of generated skills; remote MCP access from ChatGPT; production-grade DLP.

## MVP user acceptance
With a small Python/TypeScript project and no AI key or internet, user can inspect safe metadata and obtain a valid Codex setup in a staging folder. The app must never read `.env`, follow symlinks, execute source, or write to the analyzed project. Unsupported targets fail visibly.
