# Plan 0024 — Read-only MCP configuration discovery

Status: complete

## Specification facts checked

- OpenAI plugin-compatible `.mcp.json` uses a top-level `mcpServers` object whose entries describe
  servers; malformed structure is invalid.
- Gemini CLI project settings use `.gemini/settings.json` and a top-level `mcpServers` object. Entries
  may declare stdio `command` or remote `url`/`httpUrl` transports.
- Codex MCP configuration is documented under `mcp_servers` tables in `config.toml`; this repository
  will report recognized table shape only and will not claim runtime discovery.
- Sources checked 2026-10-30: OpenAI plugin MCP manifest documentation, Gemini MCP configuration
  documentation and the current repository Codex compatibility record.

## Goal

Discover declared MCP servers from bounded local configuration files without starting them, resolving
environment variables, contacting URLs, reading credentials, or returning commands/URLs/arguments.

## Scope

- Add a pure structural parser for `.mcp.json`, `.gemini/settings.json` and `.codex/config.toml`.
- Report config path, server name, transport class, validity and credential-like field presence only.
- Add explicit CLI `--mcp-config`; use it from the local MCP analysis tool without exposing raw config.
- Keep MCP discovery separate from MCP connection and tool execution; no auto-start or network access.

## Security/data-flow review

- Input: user-selected local config files under safe roots and strict size limits.
- Processing: JSON parsing or bounded line/table inspection only; no shell, URL fetch, variable
  expansion, TOML command execution or MCP client connection.
- Output: structural status only. Redact command, URL, args, headers, env values and credential names.
- Failure: malformed/unsupported files produce bounded status and generic warnings; symlink/private
  paths are skipped before reading.

## Verification

- Valid/malformed JSON and TOML-like table fixtures.
- Traversal, symlink, oversized file and injected value nondisclosure tests.
- CLI and MCP response tests confirm no command/URL/credential values and no spawned server.
- `npm ci --ignore-scripts --no-audit --no-fund`, `npm run check`, `git diff --check`.

## Result

- `analyze --mcp-config` reports bounded structural findings for recognized local MCP config files.
- The local MCP server includes only aggregate MCP-config counts in its redacted analysis response.
- Tests verify malformed/oversized/traversal inputs, value nondisclosure and absence of server startup.
