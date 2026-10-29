# ADR 0002: Minimal Codex development harness

Status: Accepted. Date: 2026-10-29.

**Context:** Excessive agents and broad skill descriptions bloat context and cause conflict.

**Decision:** Keep a concise root `AGENTS.md`, 3 opt-in read-only specialists for architecture/security/spec research and 4 focused repository skills. Use the main Codex session for ordinary implementation. Do not pin model names or force automatic network access.

**Consequences:** Clear ownership, lower overhead, easier review. Add specialists only when demonstrated by real workflow needs.
