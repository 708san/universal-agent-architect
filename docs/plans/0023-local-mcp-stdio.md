# Plan 0023 — Read-only local MCP stdio

Status: complete

## Specification facts checked

- Official MCP specification release: `2026-07-28` (checked 2026-10-30).
- Official TypeScript SDK v2 package: `@modelcontextprotocol/server@2.4.0`, Apache-2.0,
  Node `>=20`.
- Current stdio guidance uses `serveStdio` and a server factory. JSON-RPC belongs on stdout; readiness
  and diagnostics belong on stderr. The SDK supports current and legacy client openings through the
  stdio entry point.
- Official sources: `https://ts.sdk.modelcontextprotocol.io/v2/`,
  `https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio`,
  `https://blog.modelcontextprotocol.io/posts/2026-07-28/`.

## Goal

Expose a minimal local MCP stdio server that is useful for inspecting this tool's safe project facts
without executing project code, starting arbitrary MCP servers, sending network requests or returning
raw project content.

## Scope

- Add `@modelcontextprotocol/server@2.4.0` as a pinned runtime dependency and use `serveStdio`.
- Require a fixed `--project=<directory>` at process startup; tool arguments cannot select another
  directory or command.
- Expose only `list_capabilities`, `analyze_project` and `propose_blueprint`.
- Return redacted facts/blueprints only: no manifests, source, raw instructions, credentials or full
  path inventory. Log only generic diagnostics to stderr.
- Add subprocess protocol fixtures for tool listing/calls, malformed arguments, stdout purity and
  no-network/read-only behavior.

## Files expected to change

- `package.json`, `package-lock.json`, `scripts/mcp-server.mjs`.
- `tests/mcp-stdio.test.mjs` and existing capability/security tests as needed.
- `docs/COMPATIBILITY.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, this plan.

## Security/data-flow review

- Input: fixed user-authorized project root and bounded local scanner output.
- Processing: existing CLI analyzer only; no shell, no project command execution, no MCP discovery or
  server auto-start.
- Output: MCP text/structured results with redacted facts and no raw source or manifest values.
- Boundary: stdout is protocol-only; stderr contains generic diagnostics; tool inputs are schema-
  validated and do not contain filesystem paths.
- Failure: invalid project root, oversized/malformed input and analyzer failures return bounded errors;
  arbitrary tool names/arguments are rejected by the SDK.

## Verification

- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run check`
- Spawn the server with a temporary project and exercise `initialize`/`tools/list`/`tools/call` using
  newline-delimited JSON-RPC through stdin/stdout.
- Assert stdout contains only valid MCP JSON-RPC, no source/secret text, and no project mutation.
- Assert logs are absent from stdout and no network endpoint is contacted.

## Result

- `npm run mcp -- --project=<directory>` starts a fixed-scope, read-only stdio server.
- The server exposes only `list_capabilities`, `analyze_project` and `propose_blueprint`.
- The subprocess fixture verifies protocol startup, tool listing, invalid-argument rejection, redacted
  output, stdout purity and no project mutation.
