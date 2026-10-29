---
name: security-boundary-review
description: Audit changes that read local files, call AI providers, expose MCP tools, or write generated configurations. Use for any data-flow or permission-boundary change.
---

# Security boundary review

1. Diagram where inputs originate, what data is parsed, what leaves the process and where output is stored.
2. Test traversal, symlinks, oversized input, secrets, hostile skill instructions, malicious config and unapproved writes.
3. Keep deny-by-default outbound communication and consent checks outside model prompts.
4. Check that an MCP response to cloud AI is itself a disclosure; redact and reduce data before responding.
5. Return a concrete finding list with evidence, safe alternatives and tests. Never claim that regex-only secret detection guarantees no leakage.
