# Plan 0030 — Static browser distribution package

Status: complete

## Objective

Package the offline browser prototype for GitHub Pages and provide an Actions workflow that publishes
only the reviewed static assets after a user enables GitHub Pages with the Actions source.

## Facts

- The browser app already performs analysis locally and uses `connect-src 'none'` in its local server.
- The browser app currently uses root-absolute paths, which do not work under a repository subpath on
  GitHub Pages.
- GitHub's documented Pages flow uploads a static artifact and deploys it through `actions/deploy-pages`.

## Scope

- Make browser asset references repository-subpath safe without adding network behavior.
- Add a deterministic `build-pages.mjs` package step that copies only the browser entrypoint, compiled JS
  and local parser assets; exclude package metadata, source files and dependencies.
- Add a manual/`main` GitHub Pages workflow using pinned major action versions and least-privilege job
  permissions.
- Add packaging and boundary tests; update README and roadmap.

## Security/data-flow review

- The published site is static and contains no backend, credentials, project data or telemetry.
- Browser CSP continues to deny outgoing connections; user-selected files remain inside the browser.
- The package script copies only fixed local paths and `.js`/WASM assets from the build output.
- Deployment requires GitHub Pages configuration and a user-controlled merge to `main`.

## Verification

- Package fixture checks the top-level entrypoint, relative paths, allowlisted assets and absence of
  `package.json`/source files.
- Existing browser CSP/no-network test remains green.
- `npm run check` and `git diff --check`.
- GitHub Actions YAML is reviewed against current GitHub Pages documentation; actual deployment is not
  claimed until the user enables Pages and confirms a successful workflow run.

## Rollback

Disable or revert the Pages workflow and packaging script. No user project files are modified.

## Result

- Browser references are repository-subpath safe and retain the local-only CSP boundary.
- The CSP is present both in the local server response and as an HTML meta policy so static GitHub
  Pages cannot silently lose the browser network boundary.
- `npm run pages` creates `.pages/` with only the entrypoint, compiled JavaScript, browser modules and
  pinned local parser assets.
- A least-privilege `main`/manual GitHub Pages workflow uses `upload-pages-artifact@v3` and
  `deploy-pages@v4`; it contains no secrets or project-data upload step.
- `npm run check` passed: 61 tests, Skill frontmatter check, capability registry check and target
  snapshot check; Pages packaging and `git diff --check` passed.
- Live Pages deployment remains user-controlled and was not claimed as verified.
