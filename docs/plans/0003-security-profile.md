# Plan 0003 — Versioned security profile baseline

Status: declarative baseline implemented; runtime enforcement remains planned. Updated: 2026-10-30.

## Objective

Let users select a small, explicit security profile when proposing an agent blueprint, and generate
the corresponding requirements and security-test IDs without pretending that a target runtime enforces
them automatically.

## Scope

- Add `baseline` and `strict` profiles to the pure core.
- Record network, write, script, secret, symlink and raw-source policies in the Blueprint.
- Record deterministic security-test IDs for generated review plans.
- Expose profile selection in the local CLI and browser prototype.
- Include the selected profile and checks in generated Codex instructions.
- Add positive and negative tests; keep external network and arbitrary execution out of the core.

## Files

- `src/core.ts`
- `web/index.html`
- `scripts/cli.mjs`
- `tests/core.test.mjs`
- `tests/cli-integration.test.mjs`
- `docs/ARCHITECTURE.md`
- `docs/AGENT_DEVELOPMENT_STANDARD.md`

## Security boundaries

The profile is a declarative requirement and test plan. It is not a sandbox, secret detector, tool
permission enforcement layer or proof of runtime isolation. Adapters must enforce it separately and
must fail visibly when a target cannot represent a requirement.

## Verification

- Same inputs and profile produce deterministic security requirements.
- `strict` includes all baseline checks plus injection, tool misuse, MCP disclosure and resource-limit checks.
- Unsupported target behavior remains unchanged.
- `npm run check` passes offline with 13 tests.
- CLI and browser default to `baseline` unless the user selects `strict`.
- Invalid security requirements fail closed during Codex artifact generation.

## Rollback

Revert the implementation and plan changes together; the existing default behavior remains `baseline`.
