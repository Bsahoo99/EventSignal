# 05: Research official openings and rank supported opportunities

**What to build:** The owner receives concise company context and current official job evidence alongside event relationships, with strong verified matches prioritized over relevant exploratory connections. Every hiring claim is limited to what the retrieved source supports.

**Blocked by:** 04 — Analyze a public event URL with a pasted-text fallback.

**Status:** implementation present — see docs/EVALUATION.md for verification limits and pending live validation

**Source:** EventSignal PRD; user stories 14–26 and 29.

## Acceptance criteria

- [ ] Research discovers relevant company context and possible official careers/ATS sources for supported event entities. Search serves discovery rather than verification.
- [ ] Search/model operations reuse private access, conservative budget reservation, usage accounting, and bounded request policies. Included search allowances are checked rather than assumed; work with unbounded or unknown cost cannot run.
- [ ] Source reads reuse the safe public-fetch policy established for event retrieval, including redirect and private-network checks.
- [ ] An opening receives a verified label only after directly retrieving an official company page or an ATS listing demonstrably associated with that company, with a source URL and check timestamp.
- [ ] A search snippet, model-generated URL/citation, unassociated ATS result, or unreadable page cannot independently establish a verified opening. Explicitly closed or expired roles are excluded from current verified results.
- [ ] Partial evidence remains field-specific: an official company page may support a role title while unreadable job details leave requirements unknown. Missing requirements, location, or eligibility are not invented.
- [ ] Each researched company has a concise, supported explanation of relevance. A missing verified opening yields an exploratory connection where appropriate, not a claim that the company is not hiring.
- [ ] Reproducible matching uses supplied candidate evidence and retrieved facts; strong verified role matches rank above exploratory connections. No model-invented score, fixed unvalidated weighting requirement, or interview probability is introduced.
- [ ] The owner receives zero to five recommendations with event evidence, opportunity status, source-check times, candidate-specific fit, relevant experience, introduction, questions, and uncertainty.
- [ ] Company/job facts and candidate facts are attributed separately. Conversation suggestions are generated interpretations and cannot invent attendance, hiring authority, availability, or referral willingness.
- [ ] Failure to retrieve some company/job sources preserves supported results with warnings. It cannot become fabricated verification or an inaccurate global “no openings” claim.
- [ ] Workflow tests cover a readable official opening, associated/unassociated ATS sources, snippet-only evidence, blocked details, explicitly closed roles, contradictory or partial evidence, exploratory fallback, ordering, and unsupported generated claims.
- [ ] A browser check distinguishes verified and exploratory results and follows their event and job evidence separately.

## Scope notes

This slice works with the prefilled profile if ticket 03 is unfinished; profile editing is therefore not a blocker. Avoid browser automation or third-party enrichment infrastructure solely to defeat unreadable job pages. Report the limitation and retain supported partial results.

**Demo:** Analyze an event containing one company with a readable official role and another without verified openings; compare their labels, ranking explanations, and evidence.

**Implementation note:** Authorized as part of the full six-ticket scope. Acceptance checkboxes remain the original review checklist; use `docs/TICKETS.md` and `docs/EVALUATION.md` for the verified status, including incomplete provider-dependent gates.
