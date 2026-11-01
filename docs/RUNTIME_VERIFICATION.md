# Runtime verification evidence

UAA separates target format evidence from target runtime evidence. A valid `AGENTS.md`, Skill,
subagent file or plugin manifest does not prove that a host loads it or enforces its permissions.

The metadata-only contract is [`runtime-verification-evidence-0.1.schema.json`](../schemas/runtime-verification-evidence-0.1.schema.json).
The current offline fixture is [`runtime-evidence-codex-0.1.json`](../tests/fixtures/runtime-evidence-codex-0.1.json).

## Evidence levels

- `not-tested`: no target behavior was exercised.
- `format-verified`: UAA validated the documented artifact shape and local fixture only.
- `runtime-verified`: a human-reviewed, target/version-specific run observed the capability in a clean test project.
- `failed`: the target-specific check failed; keep the limitation visible.

The overall status must remain `partial` until every required capability, including permissions,
has `runtime-verified` evidence and the record is `human-reviewed`. This is an evidence gate, not
a sandbox or a permission grant.

## Safe verification workflow

1. Generate to a temporary staging directory and inspect the complete diff.
2. Use a clean, disposable target project with no secrets, credentials or customer data.
3. Record only target, edition, version, date, capability statuses, evidence IDs and limitations.
4. Do not store raw prompts, transcripts, source excerpts, absolute personal paths, tokens or MCP credentials.
5. Test positive loading and negative/security behavior separately; do not treat a successful prompt as proof of isolation.
6. Have a human review the evidence before changing compatibility status.

The UAA offline check does not require Codex CLI or any other target CLI. A missing runtime is
recorded as `not-tested`; it is never replaced with a guessed `verified` result.
