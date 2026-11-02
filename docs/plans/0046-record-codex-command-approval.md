# Plan 0046: Record Codex command approval observation

## Objective

Record that Codex executed one harmless local command only after explicit chat approval. Do not
describe this as host-level permission enforcement because no separate approval dialog or sandbox
decision was observable.

## Scope and safety

- Update only the metadata fixture, regression assertion and runtime-verification documentation.
- Store no command transcript, personal path, secret or raw project content.
- Keep aggregate `permissions` as `not-tested`; do not change the Capability Registry.

## Verification

- Run `npm run check` and `git diff --check`.
- Confirm the evidence remains `partial` and `unreviewed`.

## Progress

- [x] Confirm the command ran only after explicit chat approval.
- [x] Update metadata and documentation.
- [ ] Run checks, review diff, commit and open a PR.
