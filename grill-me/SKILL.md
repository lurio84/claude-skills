---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me" / "entrévistame".
---

Interview Lucas relentlessly about every aspect of this plan until you reach a shared understanding. Ask in Spanish.

Treat the plan as a decision tree and work it in rounds. The frontier is the set of decisions whose prerequisites are already settled. Each round, ask up to 3 frontier questions, numbered, each with your recommendation:

**P1 — título**: question, with options if any.
→ Recomiendo: X.

Word each question so "sí" accepts the recommendation; say once that "sí" accepts all of them and "2: no, …" changes one. After each answer, recompute the frontier.

**Rules:**
- Independence: if a different answer to A would change B's wording or recommendation, B goes in a later round.
- A hard-to-reverse decision, or one that needs weighing alternatives, goes alone in its round.
- If a question can be answered by reading code, vault, memory or any other source, do it yourself instead of asking. If the lookup is long, run it in the background when your environment allows it and ask now whatever doesn't depend on it.
- Flag certainty in prose ("lo verifiqué en X", "intuyo que…"), no bracket tags; see [[feedback_etiquetar_certeza]].
- Skip a question if its answer doesn't materially change the plan.
- When the frontier is empty, summarize the decisions in one block so Lucas can validate them at a glance. Implement nothing until he confirms.
