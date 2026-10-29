# ADR 0001: Pure offline-first core

Status: Accepted. Date: 2026-10-29.

**Context:** Browser, CLI and MCP interfaces must share logic while keeping user data local by default.

**Decision:** Use a pure TypeScript core accepting typed project facts and returning typed blueprints/artifacts. All filesystem, model/API, browser and network operations happen in separate boundary modules with explicit authorization.

**Consequences:** Deterministic tests and reuse are straightforward; platform-specific I/O requires extra adapters. The core must not import Node-only modules or network clients.
