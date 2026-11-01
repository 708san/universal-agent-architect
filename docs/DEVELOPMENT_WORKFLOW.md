# Development workflow

This repository uses a lightweight GitHub Flow with explicit safety gates.

## Branches

`main` is the protected integration branch. Use a short-lived branch for each coherent change:

```text
feat/<slug>
fix/<slug>
security/<slug>
docs/<slug>
test/<slug>
refactor/<slug>
ci/<slug>
chore/<slug>
```

Keep one issue or one tightly related objective per branch. Do not mix unrelated refactors with
security or behavior changes.

Before creating a branch, update local `main` from the remote and confirm the working tree is
clean. A branch must have one clear owner and exit when its PR is merged. Do not continue work on
a merged branch or use a stale branch as the base for a new change.

Recommended start/end sequence:

```text
update main -> create branch -> inspect -> plan -> edit -> test -> review diff -> PR
    -> CI + required review -> merge -> delete branch -> update local main
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>(optional-scope): short imperative description
```

Allowed common types are `feat`, `fix`, `security`, `docs`, `test`, `refactor`, `ci`, `build` and
`chore`. Use `!` or a `BREAKING CHANGE:` footer for incompatible public API changes.

Each commit should be isolated, reviewable and reversible. Before committing:

```bash
git status --short
git diff --check
npm run check
```

Never commit `.env`, credentials, private keys, raw customer/project data, `node_modules`, `dist`
or `generated` output unless a task explicitly defines a reviewed fixture.

Do not amend or rewrite a commit that has already been pushed unless the branch owner explicitly
approves it and reviewers are informed. Prefer a follow-up commit when a PR is already under review.

## Pull requests

Normal changes go through a pull request. A PR should state:

- the problem and intended behavior;
- changed files and security/data-flow implications;
- tests actually run and their results;
- remaining limitations and rollback approach.

CI must pass before merge. The author reviews the complete diff. Security, filesystem, MCP, adapter
and public-contract changes should receive an independent review when one is available.

Use squash merge for small feature branches unless preserving a deliberate commit series is useful.
Delete the branch after merge. Do not force-push shared branches.

Every PR should identify whether it changes security boundaries, data flow, public schemas, target
compatibility claims or generated-agent behavior. Such changes require a reviewer who checks the
affected tests and documentation, not just a passing build. A failed or missing CI result is a
merge blocker; never infer success from a local run.

GitHub settings are an external control plane. Maintainers should verify that `main` is protected,
direct pushes are restricted, the CI workflow is required, stale approvals are dismissed after new
commits, and force-push/deletion are disabled. This file does not claim those settings are enabled.

## Agent Git permissions

Agents may inspect repository state and prepare diffs. They must not commit, push, merge, rebase,
force-push, reset, delete branches or rewrite history without explicit user approval for that action.
The user must see the affected files and verification result before approving an external write.
Generated agents follow the same default: they may inspect state, prepare changes and report exact
commands, but they must ask before commit, push, merge, branch deletion or any history rewrite.
An explicit user approval may be scoped to one named operation; it does not authorize unrelated
GitHub changes or destructive history operations.

If GitHub, the remote or the required credential is unavailable, the agent must stop at a local
diff and provide copyable commands for the user. It must not claim a PR, CI run, merge or release
exists without external evidence.

## Release and hotfix flow

Releases start from a clean, merged `main` and require the release checks in
[`RELEASE_READINESS.md`](RELEASE_READINESS.md). Dependency, adapter, security and generated-agent
changes must include their evidence and rollback notes.

For an urgent hotfix, use `hotfix/<slug>` from the current protected `main`, keep the change
minimal, run the relevant security and regression checks, and use the normal PR/CI/review gate.
Afterward, record the incident, root cause and follow-up issue. Emergency handling does not permit
force-pushes, secret disclosure or bypassing the approval boundary.

## Release and dependency changes

The project is currently `0.x`; public APIs may change, but changes must still be documented. Use
SemVer when releases begin. Dependency updates require a reviewed lockfile, `npm run check`, and a
short note describing supply-chain impact. CI installs dependencies with scripts disabled.

Branch protection, required checks and code-owner approval are configured in GitHub settings and
must not be assumed merely because this document exists.
