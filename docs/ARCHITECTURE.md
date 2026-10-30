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

The CLI keeps generation in `generated/` staging. `apply` previews a bounded plan by default and only
mutates a user project with an explicit `--confirm`; `rollback` uses the operation-local backup record
and also requires confirmation.

The local MCP stdio adapter is read-only and fixes its project scope at process startup through
`--project=<directory>`. It exposes only capability listing, bounded analysis and blueprint proposal;
it does not expose arbitrary paths, commands, writes or MCP server discovery.

The CLI can inspect declared MCP configuration with `analyze --mcp-config`. This is structural
discovery only: it reads bounded `.mcp.json`, `.gemini/settings.json` and `.codex/config.toml` entries,
never resolves values, starts a server or contacts a URL.

The browser prototype also supports bounded, local-only ZIP import/export through a dependency-free
store-only ZIP helper. Unsupported compression, traversal, symlink entries, malformed headers and
resource-limit violations are rejected before files reach the metadata analyzer.

The CLI additionally supports an explicit `analyze ... --ast` mode. The browser prototype exposes the
same analyzer only after an explicit AST checkbox selection. Both adapters read bounded local Python
and TypeScript source files into the external `src/ast-analyzer.ts` module, which uses local Tree-sitter
WASM assets and returns only syntax/declaration/import facts. The pure core does not load Tree-sitter,
source contents or parser assets. Browser assets are copied from pinned npm packages during the local
build and served only through an explicit static allowlist.

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
- `findOutputChanges(existingPaths, artifacts): OutputChange[]`
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
- Dry-run reports source-project conflicts separately from staging collisions and emits only `add` or
  `replace` changes. Explicit config review may parse bounded recognized files for structural status,
  but never returns their contents or applies changes.
- Apply accepts only a validated manifest under `generated/`, rejects symlinked staging/project paths,
  writes through temporary files, and records replacements for scoped rollback.
- The MCP adapter uses the official stdio SDK boundary; stdout is protocol-only and tool results are
  redacted summaries rather than raw project files or manifest contents.
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
