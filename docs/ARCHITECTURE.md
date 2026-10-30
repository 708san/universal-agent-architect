# Architecture and interfaces

## Current prototype

```text
CLI (Node filesystem)       Browser (File API)
         \                    /
          -> ProjectInput -> pure core (src/core.ts)
                               | analyzeProject
                               | proposeBlueprint
                               | generateArtifacts [Codex only]
                               | validateArtifacts
                               v
                      generated artifacts (staging)
```

Core receives only `paths` and known allowlisted manifest strings, not path handles or network clients. It must never import Node filesystem APIs, HTTP libraries, cloud SDKs or subprocess modules. This supports reuse between browser and local CLI and is testable offline.

## Future modular architecture

```text
apps/{web,cli,desktop,mcp}
   -> security boundary (file scope, outbound consent, output redaction)
   -> analyzers (inventory, manifests, AST, existing skills, MCP manifests)
   -> canonical Blueprint + explanation + provenance
   -> rule planner; optionally model-assisted refinement
   -> target adapters (Codex, Claude Code, Gemini CLI, Antigravity, ChatGPT)
   -> validation (schema, safe paths, compatibility, source checks)
   -> staging / diff / approved apply / rollback

capability-registry <--- official docs updater + human-reviewed fixtures
 task-packs/coding <--- templates + deterministic recommendations
```

## Core API (implemented in `src/core.ts`)
- `analyzeProject(ProjectInput): ProjectFacts`
- `proposeBlueprint(ProjectFacts, DesignRequest): Blueprint`
- `generateArtifacts(Blueprint): GenerateResult`
- `validateArtifacts(GenerateResult): string[]`
- `findOutputConflicts(existingPaths, artifacts): OutputConflict[]`
- `safeRelativePath(string): string | null`

The canonical `Blueprint` shape is versioned in
[`schemas/blueprint-0.1.schema.json`](../schemas/blueprint-0.1.schema.json). The schema validates
data shape and allowed values; it does not enforce permissions in a target runtime. Release gates are
defined in [`docs/RELEASE_READINESS.md`](RELEASE_READINESS.md).

Supported generation also emits `UAA-MANIFEST.json`, described by
[`schemas/generation-manifest-0.1.schema.json`](../schemas/generation-manifest-0.1.schema.json), with
target, registry, verification and security provenance. It contains no project source contents.

`DesignRequest.securityProfile` selects the deterministic `baseline` or `strict` security
requirements recorded in `Blueprint.security`. The profile is a declarative requirement and test
plan; target adapters must enforce it and report unsupported enforcement visibly.
Strict Codex generation also emits an instruction-only `security-verification` Skill that organizes
bounded local evidence collection; it adds no tools or runtime permissions.

A future `scanProject()` belongs outside core because it accesses the filesystem. Untrusted project files must be treated as data, never instructions to Codex or a model. No runtime invocation of imported MCP servers during inventory.

## Adapter contract (planned)
- Target id and metadata source/version; capability checks; `render(blueprint) -> artifacts` pure; `validate(artifacts) -> findings`; fixtures; unsupported feature reporting.
- Output paths always relative to an approved staging root; reject traversal, absolute paths and duplicates.
- Dry-run reports source-project conflicts separately from staging collisions; it never reads existing
  instruction contents or applies changes.
- Avoid hardcoded model versions and undocumented service-specific keys.

## Task pack contract (planned)
- Id, supported work types, applicable signals, design rules, source citations and examples, generated skill templates, validation fixtures. A task pack cannot execute arbitrary code just by being installed.

## Update strategy
- Capability facts are versioned data with `source_url`, `checked_at`, `verification_status` and applicability scope.
- Proposed updates need local schema validation + fixtures + review before activation; never execute fetched code.

The initial offline snapshot and schema are stored in
[`data/capability-registry-0.1.json`](../data/capability-registry-0.1.json) and
[`schemas/capability-registry-0.1.schema.json`](../schemas/capability-registry-0.1.schema.json).

## Decisions
See `docs/decisions/0001-local-first-pure-core.md` and `docs/decisions/0002-minimal-codex-harness.md`.
