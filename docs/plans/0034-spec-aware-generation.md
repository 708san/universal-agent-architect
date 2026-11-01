# Plan 0034 — Spec-aware development and generation

Status: implemented for the local/offline slice. Updated: 2026-11-01.

## Objective

Improve the UAA development harness and generated agent plans without changing the offline-first
contract. The first slice makes current official evidence visible in the development configuration,
adds deterministic project-check planning, and introduces a reviewable capability-registry update
candidate workflow.

## Facts confirmed before editing

- `.codex/config.toml` already uses the current documented project-scoped agent concurrency key and
  does not configure network MCP servers.
- `.codex/agents/*.toml` defines three read-only specialist roles, but their instructions alone do
  not create a separate sandbox or permission boundary.
- `src/core.ts` generates target output and planner decisions; Codex rendering is still embedded in
  the shared core while the other four renderers are separate modules.
- `data/capability-registry-0.1.json` is a reviewed offline snapshot. No candidate diff or explicit
  activation workflow exists yet.
- Existing adapters are format-level fixtures only; runtime loading and permission enforcement must
  remain `partial` or `unknown`.

## Implementation slice

1. Add a pure capability-registry validator/diff module and a local `spec-refresh` script.
   Candidate input is an explicit local JSON file; default operation is read-only diff output.
   Activation requires validation and an explicit `--apply --confirm` gate. No fetched document is
   executed or silently promoted.
2. Extend project facts and deterministic planner checks for `test`, `security`, `dependency`,
   `build`, `lint` and `typecheck`, while retaining the single-agent default and target capability
   warnings.
3. Add the missing browser check controls and generated verification Skills for the new checks.
4. Tighten Codex read-only reviewer definitions with documented capability-disable flags, while
   keeping parent-session approval and sandbox controls authoritative.
5. Update schemas, compatibility evidence, README and roadmap/backlog status without claiming
   runtime verification.

## Files expected to change

- `src/capability-registry.ts`
- `src/core.ts`
- target adapter modules and `scripts/cli.mjs` only where the new planner data is rendered
- `scripts/spec-refresh.mjs`
- `schemas/capability-update-candidate-0.1.schema.json`
- `scripts/check-capability-registry.mjs`, `.codex/config.toml`, `.codex/agents/*.toml`
- `web/index.html`, tests and fixtures
- `docs/ARCHITECTURE.md`, `docs/COMPATIBILITY.md`, `docs/ROADMAP.md`, `docs/BACKLOG.md`, `README.md`

## Risks and mitigations

- Untrusted registry candidates could invent capabilities: validate shape, source URLs and fixture
  references; keep activation explicit and never execute candidate content.
- New planner checks could inflate output: only generate a Skill when the user explicitly requests
  the check or an existing local signal supports it; deduplicate IDs deterministically.
- Codex feature flags may narrow capabilities but cannot replace parent approvals/sandboxing: record
  this limitation in documentation and tests.
- Official docs may change: update only reviewed registry evidence and preserve `partial`/`unknown`
  when runtime behavior is not tested.

## Verification

- `npm run check`
- `npm run pages`
- `git diff --check`
- offline candidate diff test proves no registry mutation
- explicit candidate apply test proves missing `--confirm` is rejected
- deterministic planner and generated-output tests for all allowlisted checks
- negative tests for unsafe candidate URLs, unknown targets, missing fixtures and hostile text

## Rollback

Revert this plan's implementation files and documentation. The existing registry snapshot remains
the default source of truth; candidate files are disposable and are never required for normal
offline analysis.

## Official evidence checked

- Codex `AGENTS.md`, custom agents and Skills documentation: checked 2026-11-01.
- Agent Skills specification: checked 2026-11-01.
- Claude Code memory, Skills and subagent documentation: checked 2026-11-01.
- Gemini CLI subagent and Skills documentation: checked 2026-11-01.
- Runtime loading and permission enforcement for generated targets remain untested locally.

## Completion evidence

- `npm run check`: passed; 69 tests, Skill frontmatter, capability registry and target snapshots all passed.
- `npm run pages`: passed; static Pages package generated.
- `git diff --check`: passed.
- Browser boundary test passed with localhost permission enabled; the same test is expected to fail
  under the restricted sandbox because binding `127.0.0.1` is denied by the environment.
- No online retrieval or external AI call was added. The registry update workflow accepts only an
  explicit local candidate and activation requires `--confirm`.

## Remaining work

- Add explicit online retrieval only after a separate consent and allowlist design is reviewed.
- Add runtime loading tests for Codex, Claude Code, Gemini CLI, Antigravity and ChatGPT portable
  packages; current evidence remains format-level.
- Add fixture-generation and human-review tooling for changed capabilities; activation does not prove
  runtime support.
