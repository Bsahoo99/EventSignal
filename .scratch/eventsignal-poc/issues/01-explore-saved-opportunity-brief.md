# 01: Explore a saved, evidence-backed opportunity brief

**What to build:** A portfolio visitor opens EventSignal, explores a clearly labeled saved event analysis, expands recommendations, and inspects their evidence and conversation preparation. Establish the single Next.js/TypeScript application through this working experience, not a separate infrastructure-only ticket.

**Blocked by:** None (can start immediately once the breakdown is approved).

**Status:** implementation present — see docs/EVALUATION.md for verification limits and pending live validation

**Source:** EventSignal PRD; user stories 20–25 and 30–34.

## Acceptance criteria

- [ ] The application starts locally with documented commands and displays a complete saved example without credentials, network research, or model calls.
- [ ] The example is labeled saved or historical as appropriate, and shows the event date when known and source-check timestamps. It never implies that past participation or an old opening is current.
- [ ] Recommendations identify a person or company, the supported event relationship, fit explanation, supplied candidate experience to mention, and uncertainties.
- [ ] Expanding a recommendation reveals a short introduction, three informed questions, and the source references supporting factual claims.
- [ ] Verified-opening and exploratory states are visually distinct. Any sample verification label is supported by its recorded official evidence and presented as a snapshot, not a fresh check.
- [ ] The example contains up to five credible recommendations; there is no requirement to fill five slots.
- [ ] Public example data contains only selected professional information. No raw resume, private input, phone number, email address, or credentials enter public assets.
- [ ] Public mode cannot execute live research. That restriction applies to any server entry point, not only the visible controls.
- [ ] Primary controls and evidence links work with a keyboard, have accessible labels and visible focus, and remain usable on a narrow mobile viewport.
- [ ] A browser check opens the example, expands a recommendation, and inspects its evidence. A public-mode check verifies that live research cannot run.

## Scope notes

Use a typed saved analysis and evidence contract that later live results can satisfy. Do not invent a live API merely to serve static data. Initial example evidence must be honest; final real-source evaluation and example refinement belong to ticket 06. No accounts, CRM, uploads, or paid integration are required here.

**Demo:** Open the application without any secrets configured and walk through a saved networking brief and its supporting sources.

**Implementation note:** Authorized as part of the full six-ticket scope. Acceptance checkboxes remain the original review checklist; use `docs/TICKETS.md` and `docs/EVALUATION.md` for the verified status, including incomplete provider-dependent gates.
