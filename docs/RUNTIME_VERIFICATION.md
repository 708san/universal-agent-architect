# Runtime verification evidence

UAA separates target format evidence from target runtime evidence. A valid `AGENTS.md`, Skill,
subagent file or plugin manifest does not prove that a host loads it or enforces its permissions.

The metadata-only contract is [`runtime-verification-evidence-0.1.schema.json`](../schemas/runtime-verification-evidence-0.1.schema.json).
The current partial Codex VS Code fixture is [`runtime-evidence-codex-0.1.json`](../tests/fixtures/runtime-evidence-codex-0.1.json).

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
6. Have a human review the evidence before changing compatibility status. The current Codex record is
   still `unreviewed` and `partial`.

The current Codex observation includes one approved filesystem-write prompt. This is only a
partial permission observation; it does not establish command-execution, network, MCP or complete
read-only enforcement.

## Promotion into the capability registry

Runtime evidence is not activated automatically. After a human has reviewed a complete record,
run the local workflow from the repository root:

```bash
npm run build
node scripts/promote-runtime-evidence.mjs validate --evidence=/path/to/evidence.json
node scripts/promote-runtime-evidence.mjs diff --evidence=/path/to/evidence.json
node scripts/promote-runtime-evidence.mjs apply --evidence=/path/to/evidence.json --confirm
```

Only `verified` evidence with `human-reviewed` status and `runtime-verified` results for every
declared capability can be promoted. The workflow updates the selected target's registry entry and
snapshot only; it does not copy raw limitations, prompts, transcripts, source, credentials or
referenced files. `validate` and `diff` are read-only, and `apply` writes only after explicit
`--confirm` using temporary files with rollback on a write failure.

## Prepare a manual verification record

UAA can stage a blank record without claiming that any target behavior was tested:

```bash
npm run build
npm run runtime-evidence-template -- --target=codex --edition=CLI/IDE --version=unknown --date=2026-11-02
```

The file is created under `generated/`, refuses traversal and overwrite, and starts with every
capability as `not-tested`. Copy it only to a disposable, secret-free verification workflow, fill
the statuses from actual target observations, and run `validate` before considering promotion.
Creating this template does not launch Codex, another target runtime, a process, an MCP server or
any network request.

To include the optional read-only Codex reviewer subagent for subagent-format verification, add
the explicit `--reviewer` option when generating the target files:

```bash
node scripts/cli.mjs generate examples/sample-python codex baseline --reviewer
```

Without `--reviewer`, UAA intentionally generates only the main agent. This keeps the default
architecture minimal and avoids treating a reviewer as an implicit permission or runtime claim.

The UAA offline check does not require Codex CLI or any other target CLI. A missing runtime is
recorded as `not-tested`; it is never replaced with a guessed `verified` result.
