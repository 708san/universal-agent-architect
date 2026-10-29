---
name: adapter-development
description: Add or update an AI service output adapter such as Codex, Claude Code, Gemini CLI, Antigravity or ChatGPT. Use when implementing platform-specific configuration generation.
---

# Adapter development

1. Read `docs/COMPATIBILITY.md` and the latest accepted feature registry for the target.
2. Verify the exact target product, edition, config paths and supported features from official documentation. Record URLs and checked date.
3. Keep the canonical Blueprint schema unchanged unless an explicit schema decision is needed.
4. Implement pure rendering functions. Mark unsupported features clearly; no silent approximations.
5. Add golden file fixtures and negative tests, including unsupported and stale-version cases.
6. Never place tokens or local absolute paths in generated files. Validate paths and require staging/diff before apply.
7. Update support status only for behavior covered by tests.
