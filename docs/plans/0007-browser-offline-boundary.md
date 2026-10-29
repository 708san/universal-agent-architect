# Plan 0007 — Browser offline boundary

Status: complete

## Objective

Verify the static browser prototype's local-only boundary without adding a browser automation
dependency or making external network requests.

## Scope

- Restrict the prototype server to localhost, GET/HEAD and an explicit asset allowlist.
- Add baseline security headers and preserve `connect-src 'none'`.
- Add an offline integration test for CSP, allowed assets, traversal/private-path rejection, method
  rejection and absence of browser network APIs.

## Out of scope

- Full browser/Playwright E2E testing.
- GitHub Pages deployment or ZIP import/export.
- System-level protection against compromised browsers, extensions or dependencies.

## Security/data-flow considerations

- The test server must never expose arbitrary repository files.
- Test fixtures contain no private source or credentials.
- The test uses only loopback HTTP and must not contact external hosts.

## Verification

- `npm run check`
- `git diff --check`
- The local server boundary test must pass with no external network dependency.

## Rollback

Revert the server hardening, test and this plan. No user project files are modified.

## Progress

- [x] Plan written before implementation.
- [x] Harden server and add boundary test.
- [x] Record checks: `npm run check` passed with 17 tests; `git diff --check` passed. The local
  HTTP test requires loopback-listen permission in this managed environment and uses no external host.
