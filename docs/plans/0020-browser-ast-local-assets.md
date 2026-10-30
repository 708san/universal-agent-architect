# Plan 0020 — Browser-local AST assets

Status: complete

## Goal

Expose the existing bounded Python/TypeScript AST analyzer in the browser prototype while keeping
the default path metadata-only and offline. Parser runtime and grammar assets must be copied from
pinned npm packages during the local build; the browser must not load them from a CDN or another
remote origin.

## Scope

- Add a local asset-copy step for the Tree-sitter runtime and Python/TypeScript WASM grammars.
- Use an import map and an allowlisted static server path so the existing analyzer can run in a
  browser without changing the pure core.
- Add an explicit browser opt-in for bounded AST source reads. Keep it disabled by default.
- Return structural AST facts and warnings only; do not send source content to `core.ts` or include it
  in the report.
- Add no-network, asset allowlist, browser fixture and AST boundary tests.

## Files expected to change

- `package.json`, `scripts/copy-ast-assets.mjs`, `.gitignore`: local build asset preparation.
- `web/index.html`, `web/app.mjs`, `web/browser-input.mjs`, `scripts/serve.mjs`: browser loading and bounded input.
- `tests/browser-boundary.test.mjs`, `tests/browser-fixture.test.mjs`, new browser AST tests.
- `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/SECURITY.md`: implemented boundary and limits.

## Security and compatibility risks

- Generated browser assets must remain local-only and must not be fetched at runtime from npm/CDN.
- Source reads must enforce safe relative paths, Python/TypeScript extensions, file count, per-file
  bytes and total bytes before calling the analyzer.
- The browser must not expose raw source, AST nodes, absolute paths or parser errors containing source.
- `npm ci --ignore-scripts` must remain the CI install mode; the asset copy step reads package files
  only after installation and executes no dependency hooks.
- Browser AST support is opt-in and must not alter the existing metadata-only default behavior.

## Verification

- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run check`
- `git diff --check`
- Browser static-server requests for local AST assets succeed; package files and unknown paths fail.
- Browser fixture proves AST output is deterministic and raw source is absent.
- No-network browser CSP remains `connect-src 'none'`.

## Result

- The browser opt-in uses the existing bounded analyzer and local import-map assets.
- The build copies four pinned local assets into ignored `web/vendor/` output; no package install hook
  or runtime network fetch is used.
- Static server tests verify the asset allowlist and reject package files and unknown vendor paths.
