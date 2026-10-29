# Plan 0002 — Git governance and agent security baseline

Status: in progress. Updated: 2026-10-29.

## Objective

Define one small, reviewable baseline for:

- repository development and Git operations;
- generated agents and Agent Skills;
- local, MCP and future optional AI security boundaries.

The baseline must preserve the offline-first pure core and must not imply unsupported target features.

## Evidence and adopted references

- GitHub Flow: short-lived descriptive branches, isolated commits, pull requests and review.
  https://docs.github.com/en/get-started/using-github/github-flow
- GitHub protected branches and required status checks.
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Conventional Commits 1.0.0: typed commit messages and explicit breaking changes.
  https://www.conventionalcommits.org/en/v1.0.0/
- Agent Skills specification: `SKILL.md`, frontmatter constraints, compatibility metadata,
  optional experimental `allowed-tools`, and progressive disclosure.
  https://agentskills.io/specification
- MCP specification 2026-07-28: user consent and control, data privacy, and tool safety.
  https://modelcontextprotocol.io/specification/2026-07-28
- OWASP Agentic Skills Top 10 and AI Agent Security Cheat Sheet: skill execution risks,
  least privilege, validation, human approval, bounded tool chains and adversarial testing.
  https://owasp.org/projects/agentic-skills-top-10
  https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html

## Proposed policy

### Repository Git workflow

- `main` is the protected integration branch; normal changes use short-lived branches.
- Branches use `feat/<slug>`, `fix/<slug>`, `security/<slug>`, `docs/<slug>`,
  `test/<slug>`, `refactor/<slug>`, `ci/<slug>` or `chore/<slug>`.
- Pull requests are required for normal changes. CI must pass, the author must self-review,
  and security/architecture changes need an independent reviewer when available.
- Commit messages follow Conventional Commits. Prefer one isolated, reversible change per commit.
- Agents may inspect `status`, `diff`, `log` and branch state. They must not commit, push,
  merge, rebase, force-push, reset or delete history without explicit user approval.
- Never stage secrets, raw private project data, generated build output or dependency caches.
- Releases use SemVer after the public API is declared; the current `0.x` phase remains unstable.

### Agent and Skill baseline

- Every generated agent declares its target, purpose, data scope, network policy, write policy,
  tool allowlist, approval gates and failure behavior.
- Every generated Skill has a valid `SKILL.md` frontmatter and describes both what it does and
  when it should activate. `allowed-tools` is omitted unless a minimal allowlist is justified.
- Skill scripts are optional untrusted code: they require explicit review, bounded inputs,
  documented dependencies, safe errors and tests. Installation never executes imported scripts.
- Generated agents and Skills treat repository files, documents, prompts, MCP descriptions and
  tool results as untrusted data, not as instructions with authority.
- Unsupported target capabilities are rendered as unsupported; no feature equivalence is inferred.

### Security baseline

- Default network egress is deny; local analysis and the pure core require no AI or network.
- File access is bounded, path-safe, symlink-safe and limited to user-approved roots and manifests.
- Secrets, credentials, raw source and absolute local paths are excluded from logs and model-facing
  responses by default. Regex checks never constitute a guarantee of secret absence.
- Tool calls, writes, code execution, MCP access and cloud disclosure require explicit authorization
  appropriate to their risk. Generated output is staged, validated and reviewed before application.
- Enforce limits for recursion, retries, tool-chain length, file size, runtime and cost where those
  capabilities exist. Separate planning from irreversible execution.
- Test direct and indirect prompt injection, tool misuse, privilege escalation, data disclosure,
  memory/context poisoning, malicious Skills, path traversal, symlinks, malformed inputs and supply
  chain changes before production claims.

## Planned files

- `docs/DEVELOPMENT_WORKFLOW.md`: canonical Git and review rules.
- `docs/AGENT_DEVELOPMENT_STANDARD.md`: lifecycle and generated-agent/Skill contract.
- `docs/SECURITY.md`: expanded product security baseline and threat controls.
- `SECURITY.md`: public vulnerability-reporting policy and safe disclosure route.
- `AGENTS.md`: concise enforcement rules and links to the canonical documents.
- `src/core.ts`: generated `AGENTS.md` and Skill templates inherit the safe Git/agent rules.
- `tests/core.test.mjs`: generated output includes the required safety contract.
- `.github/pull_request_template.md`: review checklist.
- `.github/workflows/ci.yml`: retain offline-safe checks; add no network-dependent core tests.

## Risks and boundaries

- Branch protection and private vulnerability reporting are GitHub settings, not fully enforceable
  by repository files; setup instructions must remain explicit.
- `allowed-tools` is experimental in the Agent Skills specification, so it must not be treated as
  a portable permission system across targets.
- Security guidance reduces risk but does not provide production DLP, sandboxing or absence-of-secret
  proofs. Capability claims remain fixture- and version-dependent.

## Verification

- `npm run check` passes.
- Generated artifacts validate and contain no credentials, absolute paths or unsupported claims.
- Skill format checks cover the Agent Skills naming and description limits.
- GitHub CI passes on a branch/PR using the committed lockfile.
- Review the final docs against the cited sources and record checked dates.

## Rollback

Revert the governance/docs/template commit as one unit. Do not rewrite history or delete remote
branches to roll back policy changes.
