# Plan 0031 — UI design standard

Status: adopted baseline. Updated: 2026-10-31.

## Objective

Define a shared UI baseline for Universal Agent Architect and for generated agents or Skills that
actually contain an interactive UI. Prioritize readability, Japanese-first usability, a portable
local font stack, a small accent-color vocabulary and explicit safe-operation states.

## Scope

- Add one normative UI guideline document.
- Link the product requirements and generated-agent standard to it.
- Do not change target capability claims, generated output formats or security boundaries.

## Decisions

- The UI guideline is the normative source: `docs/UI_DESIGN_GUIDELINES.md`.
- Remote fonts, CDN assets and telemetry are not allowed in the offline core.
- Generated agents without a documented UI keep text-only guidance; adapters must not invent UI
  assets.
- UI changes that affect file scope, network, MCP, writes or execution require separate security
  review and tests.

## Changed files

- `docs/UI_DESIGN_GUIDELINES.md`
- `docs/PRODUCT_SPEC.md`
- `docs/AGENT_DEVELOPMENT_STANDARD.md`
- `docs/plans/0031-ui-design-standard.md`

## Verification

- Review the complete documentation diff for contradictions with `PRODUCT_SPEC`, `ARCHITECTURE`,
  `SECURITY` and `COMPATIBILITY`.
- Run `git diff --check`.
- Run `npm run check`; documentation-only changes must not weaken the offline test suite.

## Rollback

Revert this documentation-only change set. No runtime files, generated outputs or user project
files are modified.
