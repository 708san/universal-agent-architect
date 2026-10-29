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

## Agent Git permissions

Agents may inspect repository state and prepare diffs. They must not commit, push, merge, rebase,
force-push, reset, delete branches or rewrite history without explicit user approval for that action.
The user must see the affected files and verification result before approving an external write.

## Release and dependency changes

The project is currently `0.x`; public APIs may change, but changes must still be documented. Use
SemVer when releases begin. Dependency updates require a reviewed lockfile, `npm run check`, and a
short note describing supply-chain impact. CI installs dependencies with scripts disabled.

Branch protection, required checks and code-owner approval are configured in GitHub settings and
must not be assumed merely because this document exists.
