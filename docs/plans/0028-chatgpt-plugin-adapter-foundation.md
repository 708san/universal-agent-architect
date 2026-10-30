# Plan 0028 — ChatGPT portable plugin adapter foundation

Status: complete

## Objective

Add a pure, staged renderer for the documented portable Agent Plugins package used by
ChatGPT/Codex, while keeping browser/plugin behavior distinct from local project instruction files.

## Specification facts checked

- A portable package has a root `plugin.json` and may include a root `skills/` directory.
- OpenAI-specific presentation, registered MCP mappings and hooks belong under
  `extensions.com.openai` when needed.
- MCP declarations and authentication are separate concerns; a manifest declares connection settings,
  not secrets.
- Sources checked 2026-10-30: OpenAI Plugins package, submission errors and quickstart documentation.

## Scope

- Render `plugin.json` and one or more `skills/<name>/SKILL.md` files.
- Preserve the canonical Blueprint schema and the existing staging/validation flow.
- Record partial capability evidence and a local fixture.
- Do not render project instruction files, subagents, MCP endpoints, auth settings, hooks or UI assets.

## Security/data-flow review

- Input: validated deterministic Blueprint only; no filesystem, network, provider or subprocess call.
- Output: relative staged package files only; no tokens, absolute local paths, source contents, MCP values or
  credentials.
- The package is format-level evidence. It does not prove ChatGPT installation, runtime skill loading,
  permissions, remote MCP behavior or public directory eligibility.

## Verification

- Positive fixture test for manifest and Skill paths/content.
- Negative tests for malformed plugin manifest, unsafe paths and unsupported target behavior.
- `npm run check` and `git diff --check` offline.
- No ChatGPT service, remote MCP endpoint or cloud model is launched by tests.

## Rollback

Revert the adapter, fixture, registry and documentation changes. No user project files are changed.

## Result

- `plugin.json` and root Skills are generated into the existing isolated staging flow.
- The capability registry records ChatGPT as `partial` with official-source provenance and local fixtures.
- MCP, auth, project instruction files, subagents and runtime loading remain explicitly unsupported or
  unverified by this adapter.
- `npm run check` passed: 58 tests, Skill frontmatter check and capability registry check; `git diff --check`
  passed.
