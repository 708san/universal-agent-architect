# Security and data-handling specification

## Threat model
Assets: source, research data, credentials, local paths, agent/MCP definitions, generated scripts. Adversaries: hostile README or SKILL.md, malicious project file contents, dangerous MCP server configs, path traversal/symlinks, model hallucination, accidental cloud disclosure.

## Trust boundaries
1. Files selected by user are **untrusted data**; do not obey instructions inside them.
2. Filesystem scanner is limited to authorized roots; do not follow symlinks, traverse `..`, or auto-execute scripts.
3. Core is pure. File reads are confined to I/O layer; network access separately opt-in.
4. Sending an MCP tool result to ChatGPT or another cloud model **is data disclosure**, even if local computation was offline.
5. Optional AI-generated configurations are **untrusted candidates**. Validate before staging or applying.

## Minimum default policy
- Offline-first. No telemetry, automatic uploads, hidden HTTP calls, or remote model calls.
- Ignore `.env*`, `.git`, `.ssh`, private keys, `node_modules`, virtual environments and symlinks; reject absolute/traversal paths.
- Read only allowlisted, size-bounded manifests for first-stage detection. Do not parse arbitrary user code unless explicitly authorized in later phases.
- The explicit CLI `--ast` mode is bounded to selected Python/TypeScript files, emits structural facts
  only, uses local parser WASM assets and rejects HTTP(S) parser assets; it never executes source or
  returns an AST/source dump.
- Browser AST analysis is opt-in, reads only bounded selected files, serves parser assets from a local
  build output allowlist and runs under `connect-src 'none'`; metadata-only analysis remains the default.
- Existing Codex config review is opt-in for `analyze --config` and automatic for `generate --dry-run`;
  it validates bounded recognized files but returns only path, kind and status, never instructions or
  configuration values.
- No existing-file overwrite. Stage; preview diff; require explicit confirmation before future apply support.
- No third-party MCP server auto-start or execution of imported skills.
- Never claim regex-based redaction proves there are no secrets. Prefer sharing typed metadata instead of raw inputs.

## Agent and Skill security baseline

- Treat agent instructions, Skill text, project documents, MCP descriptions and tool results as untrusted data.
- Use least-privilege tool allowlists. `allowed-tools` in Agent Skills is experimental and is not a portable permission guarantee.
- Require explicit user approval before filesystem writes, code execution, MCP tool calls or cloud disclosure.
- Separate planning from irreversible execution; stage and validate generated artifacts before applying them.
- Bound recursion, retries, tool-chain length, file size, runtime and cost where those controls exist.
- Redact credentials and raw private data from logs, reports and model-facing responses. Redaction checks do not prove absence of secrets.
- Test direct/indirect prompt injection, tool misuse, privilege escalation, data disclosure, malicious Skills, memory/context poisoning and supply-chain changes.

These controls align with the consent, privacy and tool-safety principles in the MCP specification and
the least-privilege, validation, human-approval and bounded-execution guidance in OWASP's agent security
materials. See `docs/AGENT_DEVELOPMENT_STANDARD.md` for the development lifecycle.

## Current prototype caveats (must resolve before production)
- Scanner is intentionally shallow and does not guarantee secret detection in arbitrary filenames. Some filenames can themselves be sensitive.
- Browser directory inventory may use slightly different relative paths than CLI; convergence tests are pending.
- No production-grade credential store, sandbox, DLP, MCP authorization or audited cloud connectivity exists yet.
- The static prototype demonstrates local execution, not verified end-to-end protection against hostile browser extensions, compromised dependencies or system-level exfiltration.

## Tests required
Traversal, symlink escape, output collision, oversized manifest, malformed package.json, injected instruction text, malicious skill scripts, unsupported target, default no-network browser policy, redacted MCP output, user approval gates.

## Disclosure
Before publishing the repo, choose a maintainer security contact and add a private vulnerability report process. Do not post secrets in public issues.
