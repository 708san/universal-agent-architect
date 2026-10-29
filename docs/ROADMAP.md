# Development roadmap

No fabricated calendar deadlines. Progression is gated by working tests and verified behavior.

## P0 — Foundation (this repository)
- [x] Project overview, scope, security rules, Codex guidance, focused skills, specialist reviewers.
- [x] Pure TS rule-based prototype, safe project inventory, Codex sample generator, tests, basic browser/CLI.
- [ ] Confirm CI on GitHub; publish in private repository; create issues from `docs/BACKLOG.md`; commit a reviewed dependency lockfile.
- [ ] Fix documented prototype limitations and add fixture-based integration tests.

**Exit:** offline `npm run check` succeeds, prototype works, and documents clearly distinguish implemented vs planned.

## P1 — Coding MVP
- [ ] Formal schema and versioned fixtures for Blueprint and capability registry.
- [ ] Parser for existing Codex configuration + conflicts + dry-run diffs.
- [ ] Robust project analysis (AST via Tree-sitter WASM), bounded file budget and OS-specific safe file traversal.
- [ ] Minimal decision engine with explainability and eval fixtures; no unnecessary agent inflation.
- [ ] Verified Codex adapter covering rules/skills and supported subagent/MCP proposals.
- [ ] Browser ZIP import/export; safe directory selection fallback; static Pages deploy only after CSP/security tests.

**Exit:** safe coding-project analysis; reproducible, verified Codex files; no AI required.

## P2 — Local integration
- [ ] CLI application/rollback with staging, diff and explicit consent.
- [ ] Local MCP stdio with read-only operations first; test data minimization and injected text threats.
- [ ] Target adapters for Claude Code, Gemini CLI, Antigravity, ChatGPT (each staged and verified separately).
- [ ] MCP discovery from configuration only (no auto-start of arbitrary third-party servers).

**Exit:** repeatable tests for every declared target; local MCP works without disclosing raw files by default.

## P3 — Safe AI enrichment and spec updates
- [ ] Optional local model connector behind an outbound isolation boundary.
- [ ] Cloud provider connectors with data minimization, preview and consent.
- [ ] Specification registry update checker and candidate-diff workflow.
- [ ] Threat tests for secrets, prompt injection, malicious manifests, remote data return.

**Exit:** online modes are opt-in; the core remains usable with network disabled.

## P4 — Extensible product
- [ ] Task packs: notebooks, slides, research, analytics.
- [ ] Adapter and task-pack authoring/developer validation workflows.
- [ ] Polished UI, packaging, user docs and optional signed desktop releases.
- [ ] Evaluate model-assisted blueprint planning vs deterministic baseline and document measured benefit.

**Exit:** third parties can add targets/task packs without editing the core engine.
