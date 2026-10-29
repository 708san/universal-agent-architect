---
name: change-planning
description: Plan multi-file or risky development changes in this repository before implementation. Use for architectural changes, refactors, security-sensitive work, or multi-session features.
---

# Change planning

1. Read `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, relevant accepted decisions and the current phase.
2. Write the smallest viable plan: objective, files, interface changes, security/data-flow risks, tests and rollback.
3. Update `docs/plans/` when work spans sessions. Mark facts, assumptions and open questions separately.
4. Implement only the agreed slice; keep a short progress checklist and capture evidence from tests.
5. At completion, update the plan and relevant compatibility/documentation records.
