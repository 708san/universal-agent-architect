# Plan 0042: Runtime Evidence template preparation

## Objective

Add a local-only command that creates a bounded, not-tested Runtime Evidence template for
manual target verification. The template must make no runtime claim and must be staged under
`generated/` without overwriting an existing file.

## Scope and files

- `src/runtime-evidence.ts`: expose the target list and a pure template factory.
- `scripts/create-runtime-evidence-template.mjs`: validate explicit target metadata and write
  a new JSON template only inside the repository staging directory.
- `tests/runtime-evidence.test.mjs`: cover deterministic template fields, successful staging,
  overwrite refusal and traversal rejection.
- `package.json`: expose the command.
- `docs/RUNTIME_VERIFICATION.md`: document how to prepare, manually complete and validate evidence.

## Security and data-flow risks

- Inputs are CLI metadata only; the command must not read a project, execute a target, contact
  a network or include source, prompts, credentials or transcripts.
- Output is limited to `generated/`; absolute paths, traversal and symlinked parents are rejected.
- Existing files are never overwritten. The generated template remains `not-tested` and cannot
  pass the existing promotion gate until a human completes actual target verification.

## Verification and rollback

- Run focused runtime-evidence tests, `npm run check` and `git diff --check`.
- Exercise the command with a temporary staged path and confirm invalid paths do not write.
- The feature is isolated to one branch; reverting its commit removes the helper without
  changing the Runtime Evidence or capability registry schemas.

## Progress

- [x] Confirm latest merged main and inspect existing runtime/CLI boundaries.
- [x] Define the smallest template-only scope.
- [x] Implement the factory and guarded staging command.
- [x] Add tests and documentation.
- [x] Run checks and review the complete diff.
- [ ] Commit and open a PR.
