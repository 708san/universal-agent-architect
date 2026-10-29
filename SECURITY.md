# Security policy

Universal Agent Architect is an offline-first prototype. Do not post credentials, private source,
tokens or exploit details in public issues.

## Reporting

Use GitHub's private vulnerability reporting for this repository when available. If it is unavailable,
contact the maintainer privately through the repository owner before creating a public issue.

Include only the minimum reproducible information needed to validate the report. Remove secrets and
private project contents. The maintainer should acknowledge the report, reproduce it offline where
possible, document the affected commit/version, and publish only a redacted resolution after review.

## Scope

Relevant security boundaries include local file selection, path traversal, symlink handling, generated
configuration writes, Skill and MCP execution, cloud disclosure, dependency and workflow supply chain,
prompt injection, and secret exposure. The detailed product data-handling policy is in
[`docs/SECURITY.md`](docs/SECURITY.md).
